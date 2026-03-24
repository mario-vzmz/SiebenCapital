"""
AMT Edge Discovery v2 — MNQ1!
==============================
Calcula Volume Profile en Python con OHLCV de 30 min RTH.
Segmenta resultados por ATR 3 días y EMA 8 diaria.
ATR y EMA se usan SOLO como segmentación — no como condiciones de entrada.

Uso:
    python3 amt_edge_discovery.py \
        --csv MNQ_4years.csv \
        --output AMT_Edge_Discovery.md \
        --min_n 30 \
        --min_lift 1.3
"""

import argparse
import pandas as pd
import numpy as np
from itertools import combinations
from pathlib import Path

TICK      = 0.25
VA_PCT    = 0.70
RTH_START = "09:30"
RTH_END   = "16:00"
IB_END    = "10:00"
MIN_RTH_BARS = 10
MIN_IB_BARS  = 2
MIN_VOL_DAY  = 1000


# ─── Volume Profile ───────────────────────────────────────────────────────────

def calcular_vp(rth_df, tick=TICK, va_pct=VA_PCT):
    if len(rth_df) < 3: return None
    s_hi = round(rth_df["high"].max() / tick) * tick
    s_lo = round(rth_df["low"].min()  / tick) * tick
    if s_hi <= s_lo: return None
    n_levels = min(int(round((s_hi - s_lo) / tick)) + 1, 4000)
    vol_levels = np.zeros(n_levels)
    for _, bar in rth_df.iterrows():
        b_hi   = round(bar["high"] / tick) * tick
        b_lo   = round(bar["low"]  / tick) * tick
        b_vol  = bar["volume"]
        n_tks  = max(int(round((b_hi - b_lo) / tick)) + 1, 1)
        vol_tk = b_vol / n_tks
        lo_idx = int(round((b_lo - s_lo) / tick))
        hi_idx = int(round((b_hi - s_lo) / tick))
        for t in range(lo_idx, min(hi_idx + 1, n_levels)):
            if 0 <= t < n_levels:
                vol_levels[t] += vol_tk
    poc_idx = int(np.argmax(vol_levels))
    poc     = round(s_lo + poc_idx * tick, 2)
    tot_vol = vol_levels.sum()
    tgt     = tot_vol * va_pct
    va_hi   = va_lo = poc_idx
    va_vol  = vol_levels[poc_idx]
    for _ in range(n_levels):
        if va_vol >= tgt: break
        can_up = va_hi + 1 < n_levels
        can_dn = va_lo - 1 >= 0
        v_up   = vol_levels[va_hi + 1] if can_up else 0.0
        v_dn   = vol_levels[va_lo - 1] if can_dn else 0.0
        if can_up and can_dn and v_up == v_dn:
            va_hi += 1; va_lo -= 1; va_vol += v_up + v_dn
        elif can_up and (not can_dn or v_up > v_dn):
            va_hi += 1; va_vol += v_up
        elif can_dn:
            va_lo -= 1; va_vol += v_dn
        else: break
    return {"poc": poc,
            "vah": round(s_lo + va_hi * tick, 2),
            "val": round(s_lo + va_lo * tick, 2)}


# ─── Indicadores diarios — ATR 3D y EMA 8D ───────────────────────────────────

def calcular_indicadores_diarios(df_rth_por_dia):
    """
    Calcula ATR(3) y EMA(8) sobre cierres/rangos diarios.
    Retorna un dict {fecha: {atr3, ema8, precio_vs_ema8}}
    """
    fechas_ordenadas = sorted(df_rth_por_dia.keys())
    cierres  = []
    rangos   = []
    resultados = {}

    for fecha in fechas_ordenadas:
        rth = df_rth_por_dia[fecha]
        cierre = rth["close"].iloc[-1]
        rango  = rth["high"].max() - rth["low"].min()
        cierres.append(cierre)
        rangos.append(rango)

        n = len(cierres)

        # ATR 3 días — media del rango diario de los últimos 3 días
        atr3 = np.mean(rangos[-3:]) if n >= 3 else np.mean(rangos)

        # EMA 8 días — EMA de los últimos cierres diarios
        if n == 1:
            ema8 = cierre
        else:
            k = 2 / (8 + 1)  # factor de suavizado EMA 8
            ema8_prev = resultados[fechas_ordenadas[n-2]]["ema8"] if n >= 2 else cierre
            ema8 = cierre * k + ema8_prev * (1 - k)

        resultados[fecha] = {
            "atr3":         round(atr3, 2),
            "ema8":         round(ema8, 2),
            "precio_ema8":  "ENCIMA" if cierre > ema8 else "DEBAJO",
            "cierre_diario": cierre,
        }

    return resultados


# ─── Validación de sesión ─────────────────────────────────────────────────────

def sesion_valida(rth, ib):
    if len(rth) < MIN_RTH_BARS:
        return False, f"sesion_corta ({len(rth)} barras)"
    if len(ib) < MIN_IB_BARS:
        return False, f"ib_incompleto ({len(ib)} barras)"
    if rth["volume"].sum() < MIN_VOL_DAY:
        return False, f"volumen_bajo ({rth['volume'].sum():.0f})"
    return True, "ok"


# ─── Construir fila de features + outcomes ────────────────────────────────────

def construir_fila(fecha, rth, ib, vp_previo, rth_prev, hist_ib, indicadores_dia):
    op   = rth["open"].iloc[0]
    cp   = rth_prev["close"].iloc[-1]
    vah  = vp_previo["vah"]
    val  = vp_previo["val"]
    poc  = vp_previo["poc"]

    ibh      = ib["high"].max()
    ibl      = ib["low"].min()
    ib_range = round(ibh - ibl, 2)
    ib_vol   = ib["volume"].sum()
    ib_close = ib["close"].iloc[-1]

    if ib_range <= 0: return None

    dh      = rth["high"].max()
    dl      = rth["low"].min()
    dc      = rth["close"].iloc[-1]
    ext_up  = max(0, dh - ibh)
    ext_dn  = max(0, ibl - dl)
    day_vol = rth["volume"].sum()
    va_range = max(vah - val, 1)

    # VWAP IB calculado en Python
    ib_vwap = (ib["close"] * ib["volume"]).sum() / ib["volume"].sum() \
              if ib["volume"].sum() > 0 else ib["close"].mean()
    vwap_slope = "ALCISTA" if ib_close > ib_vwap * 1.0002 else \
                 "BAJISTA" if ib_close < ib_vwap * 0.9998 else "PLANO"

    hist_ib.append(ib_range)

    # ATR 3D y EMA 8D del día ANTERIOR (indicadores del día previo al que estamos analizando)
    atr3  = indicadores_dia.get("atr3",  np.mean(hist_ib[-3:]) if len(hist_ib) >= 3 else ib_range)
    ema8  = indicadores_dia.get("ema8",  op)
    p_ema = indicadores_dia.get("precio_ema8", "ENCIMA" if cp > ema8 else "DEBAJO")

    # Cuartiles dinámicos del ATR histórico
    # (se actualiza con cada sesión procesada)
    atr_mediana = np.median([r for r in hist_ib]) if len(hist_ib) >= 5 else atr3

    # ── Condiciones observables (F1 + F2) ────────────────────────────────
    conds = {
        "abre_encima_va":      int(op > vah),
        "abre_debajo_va":      int(op < val),
        "abre_dentro_va":      int(val <= op <= vah),
        "gap_alcista":         int(op > cp + 2),
        "gap_bajista":         int(op < cp - 2),
        "sin_gap":             int(abs(op - cp) <= 2),
        "abre_lejos_arriba":   int(op > vah + va_range * 0.5),
        "abre_lejos_abajo":    int(op < val - va_range * 0.5),
        "abre_cerca_vah":      int(vah < op <= vah + va_range * 0.25),
        "abre_cerca_val":      int(val - va_range * 0.25 <= op < val),
        "abre_cerca_poc":      int(abs(op - poc) <= va_range * 0.15),
        "ib_confirma_arriba":  int(ibl >= vah),
        "ib_confirma_abajo":   int(ibh <= val),
        "ib_rechaza_arriba":   int(op > vah and ibh < vah),
        "ib_rechaza_abajo":    int(op < val and ibl > val),
        "ib_dentro_va":        int(ibl >= val and ibh <= vah),
        "ib_toca_vah":         int(ibh >= vah >= ibl),
        "ib_toca_val":         int(ibh >= val >= ibl),
        "ib_toca_poc":         int(ibh >= poc >= ibl),
        "ib_cierra_arr_vah":   int(ib_close > vah),
        "ib_cierra_bajo_val":  int(ib_close < val),
        "ib_cierra_dentro_va": int(val <= ib_close <= vah),
        "vwap_alcista":        int(vwap_slope == "ALCISTA"),
        "vwap_bajista":        int(vwap_slope == "BAJISTA"),
        "vwap_plano":          int(vwap_slope == "PLANO"),
        "ib_vol_alto":         int(ib_vol > day_vol * 0.15),
        "ib_vol_bajo":         int(ib_vol < day_vol * 0.08),
    }

    if len(hist_ib) >= 5:
        p33, p67 = np.percentile(hist_ib, [33, 67])
        conds["ib_estrecho"] = int(ib_range < p33)
        conds["ib_normal"]   = int(p33 <= ib_range <= p67)
        conds["ib_amplio"]   = int(ib_range > p67)
    else:
        conds["ib_estrecho"] = 0
        conds["ib_normal"]   = 1
        conds["ib_amplio"]   = 0

    # ── Outcomes ──────────────────────────────────────────────────────────
    ir = max(ibh - ibl, 0.25)
    outcomes = {
        "trend_up":         int(ext_up > ir*0.5 and ext_dn < ir*0.25),
        "trend_down":       int(ext_dn > ir*0.5 and ext_up < ir*0.25),
        "trend_day":        int((ext_up > ir*0.5 and ext_dn < ir*0.25) or
                                (ext_dn > ir*0.5 and ext_up < ir*0.25)),
        "neutral_day":      int(ext_up > ir*0.25 and ext_dn > ir*0.25),
        "normal_day":       int(ext_up <= ir*0.25 and ext_dn <= ir*0.25),
        "rompe_ibh":        int(dh > ibh),
        "rompe_ibl":        int(dl < ibl),
        "solo_rompe_ibh":   int(dh > ibh and dl >= ibl),
        "solo_rompe_ibl":   int(dl < ibl and dh <= ibh),
        "cierra_encima_va": int(dc > vah),
        "cierra_debajo_va": int(dc < val),
        "cierra_dentro_va": int(val <= dc <= vah),
        "extension_2x":     int(max(ext_up, ext_dn) > ir*2),
        "extension_3x":     int(max(ext_up, ext_dn) > ir*3),
    }

    row = {
        "fecha": str(fecha),
        "open": op, "close_prev": cp,
        "gap": round(op-cp, 2),
        "vah": vah, "val": val, "poc": poc,
        "ib_high": round(ibh,2), "ib_low": round(ibl,2),
        "ib_range": ib_range,
        "rango_dia": round(dh-dl, 2),
        "ext_up": round(ext_up,2), "ext_dn": round(ext_dn,2),
        "factor_ext": round(max(ext_up,ext_dn)/ir, 2),
        # Segmentación ATR y EMA (no condiciones — solo para filtrar)
        "atr3":         atr3,
        "ema8":         ema8,
        "seg_ema":      p_ema,                              # ENCIMA / DEBAJO
        "seg_atr":      "ALTO" if atr3 > atr_mediana else "BAJO",  # ALTO / BAJO
        "atr_vs_ib":    round(atr3 / ib_range, 2) if ib_range > 0 else 1.0,
    }
    row.update(conds)
    row.update(outcomes)
    return row


# ─── Labels ───────────────────────────────────────────────────────────────────

OUTCOME_LABELS = {
    "trend_up":         "Trend Day ALCISTA",
    "trend_down":       "Trend Day BAJISTA",
    "trend_day":        "Trend Day (cualquier dirección)",
    "neutral_day":      "Día Neutral",
    "normal_day":       "Día Normal",
    "rompe_ibh":        "Rompe IBH post 10:00",
    "rompe_ibl":        "Rompe IBL post 10:00",
    "solo_rompe_ibh":   "Solo rompe IBH",
    "solo_rompe_ibl":   "Solo rompe IBL",
    "cierra_encima_va": "Cierra encima del VA",
    "cierra_debajo_va": "Cierra debajo del VA",
    "cierra_dentro_va": "Cierra dentro del VA",
    "extension_2x":     "Extensión > 2x IB range",
    "extension_3x":     "Extensión > 3x IB range",
}

COND_LABELS = {
    "abre_encima_va":      "Apertura encima del VAH previo",
    "abre_debajo_va":      "Apertura debajo del VAL previo",
    "abre_dentro_va":      "Apertura dentro del VA previo",
    "gap_alcista":         "Gap alcista (> 2 pts)",
    "gap_bajista":         "Gap bajista (> 2 pts)",
    "sin_gap":             "Sin gap (≤ 2 pts)",
    "abre_lejos_arriba":   "Apertura muy lejos arriba (> 50% VA sobre VAH)",
    "abre_lejos_abajo":    "Apertura muy lejos abajo (> 50% VA bajo VAL)",
    "abre_cerca_vah":      "Apertura cerca del VAH (dentro 25% VA range)",
    "abre_cerca_val":      "Apertura cerca del VAL (dentro 25% VA range)",
    "abre_cerca_poc":      "Apertura cerca del POC (± 15% VA range)",
    "ib_confirma_arriba":  "IB confirmó arriba — IB low >= VAH",
    "ib_confirma_abajo":   "IB confirmó abajo — IB high <= VAL",
    "ib_rechaza_arriba":   "IB rechazó alza — abrió arriba, IB regresó al VA",
    "ib_rechaza_abajo":    "IB rechazó baja — abrió abajo, IB regresó al VA",
    "ib_dentro_va":        "IB completo dentro del VA",
    "ib_toca_vah":         "IB tocó el VAH durante el primer TPO",
    "ib_toca_val":         "IB tocó el VAL durante el primer TPO",
    "ib_toca_poc":         "IB tocó el POC durante el primer TPO",
    "ib_cierra_arr_vah":   "IB cierra arriba del VAH",
    "ib_cierra_bajo_val":  "IB cierra abajo del VAL",
    "ib_cierra_dentro_va": "IB cierra dentro del VA",
    "vwap_alcista":        "VWAP IB con pendiente alcista",
    "vwap_bajista":        "VWAP IB con pendiente bajista",
    "vwap_plano":          "VWAP IB plano",
    "ib_vol_alto":         "Volumen IB alto (> 15% del volumen diario)",
    "ib_vol_bajo":         "Volumen IB bajo (< 8% del volumen diario)",
    "ib_estrecho":         "IB estrecho (< percentil 33 histórico)",
    "ib_normal":           "IB tamaño normal (percentil 33–67)",
    "ib_amplio":           "IB amplio (> percentil 67 histórico)",
}


# ─── Motor de edge discovery ──────────────────────────────────────────────────

def buscar_edges(res, cond_cols, outcome_cols, min_n, min_lift):
    baselines = {o: res[o].mean() for o in outcome_cols}
    edges = []
    for outcome in outcome_cols:
        baseline = baselines[outcome]
        if baseline == 0 or baseline == 1: continue
        for n_c in [1, 2, 3]:
            for combo in combinations(cond_cols, n_c):
                mask = np.ones(len(res), dtype=bool)
                for c in combo:
                    mask &= (res[c] == 1)
                sub = res[mask]
                if len(sub) < min_n: continue
                p    = sub[outcome].mean()
                lift = p / baseline if baseline > 0 else 0
                if lift >= min_lift:
                    edges.append({
                        "outcome":     outcome,
                        "condiciones": " + ".join(combo),
                        "n_conds":     n_c,
                        "n_sesiones":  len(sub),
                        "n_outcome":   int(sub[outcome].sum()),
                        "prob":        round(p, 3),
                        "baseline":    round(baseline, 3),
                        "lift":        round(lift, 2),
                    })
    return pd.DataFrame(edges) if edges else pd.DataFrame(
        columns=["outcome","condiciones","n_conds","n_sesiones","n_outcome","prob","baseline","lift"]), baselines


def barra(p, w=20):
    n = int(round(p * w))
    return "█"*n + "░"*(w-n) + f" {p:.0%}"


# ─── Generador de sección de edge ─────────────────────────────────────────────

def seccion_edge(res, cond_cols, outcome_cols, min_n, min_lift, titulo, nota=""):
    edges, baselines = buscar_edges(res, cond_cols, outcome_cols, min_n, min_lift)
    N = len(res)

    md  = f"\n## {titulo}\n\n"
    if nota:
        md += f"> {nota}\n\n"
    md += f"**Sesiones en este segmento:** {N}\n\n"

    md += "### Baselines en este segmento\n\n"
    md += "| Outcome | Prob base | Frecuencia | Barra |\n|---|---|---|---|\n"
    for o, b in baselines.items():
        n_oc = int(res[o].sum()) if o in res.columns else 0
        md += f"| {OUTCOME_LABELS.get(o,o)} | {b:.0%} | {n_oc}/{N} | {barra(b)} |\n"
    md += "\n"

    if len(edges) == 0:
        md += "> Sin setups con los filtros actuales en este segmento.\n\n"
        return md, edges, baselines

    # Rankings
    # 1. Por lift
    md += "### 🏆 Top 20 por Lift\n\n"
    md += "| # | Outcome | Condiciones | n | Bateo | Baseline | Lift |\n|---|---|---|---|---|---|---|\n"
    for rank, (_, r) in enumerate(edges.sort_values("lift", ascending=False).head(20).iterrows(), 1):
        partes = r["condiciones"].split(" + ")
        desc   = " + ".join([COND_LABELS.get(p,p) for p in partes])
        md += f"| {rank} | {OUTCOME_LABELS.get(r['outcome'],r['outcome'])} | {desc} | {r['n_sesiones']} | **{r['prob']:.0%}** | {r['baseline']:.0%} | **{r['lift']}x** |\n"

    # 2. Por bateo (baseline >= 25%)
    md += "\n### 🎯 Top 20 por Bateo (baseline ≥ 25%)\n\n"
    md += "| # | Outcome | Condiciones | n | Bateo | Baseline | Lift |\n|---|---|---|---|---|---|---|\n"
    top_b = edges[edges["baseline"] >= 0.25].sort_values("prob", ascending=False).head(20)
    if len(top_b) == 0:
        md += "> Sin setups con baseline ≥ 25% en este segmento.\n"
    else:
        for rank, (_, r) in enumerate(top_b.iterrows(), 1):
            partes = r["condiciones"].split(" + ")
            desc   = " + ".join([COND_LABELS.get(p,p) for p in partes])
            md += f"| {rank} | {OUTCOME_LABELS.get(r['outcome'],r['outcome'])} | {desc} | {r['n_sesiones']} | **{r['prob']:.0%}** | {r['baseline']:.0%} | **{r['lift']}x** |\n"

    # 3. Por baseline
    md += "\n### 📊 Top 20 por Baseline (outcomes más frecuentes con mejor lift)\n\n"
    md += "| # | Outcome | Condiciones | n | Bateo | Baseline | Lift |\n|---|---|---|---|---|---|---|\n"
    for rank, (_, r) in enumerate(edges.sort_values(["baseline","lift"], ascending=[False,False]).head(20).iterrows(), 1):
        partes = r["condiciones"].split(" + ")
        desc   = " + ".join([COND_LABELS.get(p,p) for p in partes])
        md += f"| {rank} | {OUTCOME_LABELS.get(r['outcome'],r['outcome'])} | {desc} | {r['n_sesiones']} | **{r['prob']:.0%}** | {r['baseline']:.0%} | **{r['lift']}x** |\n"

    return md, edges, baselines


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AMT Edge Discovery v2 — MNQ1!")
    parser.add_argument("--csv",      required=True)
    parser.add_argument("--output",   default="AMT_Edge_Discovery.md")
    parser.add_argument("--from",     dest="date_from", default=None)
    parser.add_argument("--to",       dest="date_to",   default=None)
    parser.add_argument("--min_n",    type=int,   default=30)
    parser.add_argument("--min_lift", type=float, default=1.3)
    args = parser.parse_args()

    print(f"\n📂 Cargando {args.csv}...")
    df = pd.read_csv(args.csv)
    df["time"] = pd.to_datetime(df["time"], utc=True)
    df = df.set_index("time").sort_index()
    df.index = df.index.tz_convert("America/Chicago")
    df.columns = [c.strip().lower() for c in df.columns]

    print(f"   Rango: {df.index[0].date()} → {df.index[-1].date()}")
    print(f"   Barras: {len(df):,} | Columnas: {list(df.columns)}\n")

    # ── Paso 1: recolectar RTH por día para indicadores diarios ───────────────
    print("📊 Calculando ATR 3D y EMA 8D sobre cierres diarios...")
    dias = df.index.normalize().unique()
    rth_por_dia = {}
    for d in dias:
        rth = df[df.index.date == d.date()].between_time(RTH_START, RTH_END)
        if len(rth) >= MIN_RTH_BARS and rth["volume"].sum() >= MIN_VOL_DAY:
            rth_por_dia[d.date()] = rth

    indicadores = calcular_indicadores_diarios(rth_por_dia)
    print(f"   Días con indicadores: {len(indicadores)}")

    # ── Paso 2: procesar sesiones y construir dataset ──────────────────────────
    print("\n⚙️  Procesando sesiones y calculando Volume Profile...")
    rows        = []
    descartadas = []
    vp_previo   = None
    rth_prev    = None
    hist_ib     = []
    fechas_dias = sorted(rth_por_dia.keys())

    for i, d in enumerate(fechas_dias):
        rth = rth_por_dia[d]
        ib  = df[df.index.date == d].between_time(RTH_START, IB_END)

        ok, razon = sesion_valida(rth, ib)
        if not ok:
            descartadas.append({"fecha": str(d), "razon": razon})
            vp_previo = None; rth_prev = None
            continue

        vp = calcular_vp(rth)
        if not vp:
            descartadas.append({"fecha": str(d), "razon": "vp_invalido"})
            continue

        if vp_previo and rth_prev is not None:
            # Usamos indicadores del día ANTERIOR como contexto del día actual
            fecha_prev = fechas_dias[i-1] if i > 0 else d
            ind_prev   = indicadores.get(fecha_prev, {"atr3": 100, "ema8": rth_prev["close"].iloc[-1], "precio_ema8": "ENCIMA"})

            row = construir_fila(d, rth, ib, vp_previo, rth_prev, hist_ib, ind_prev)
            if row:
                rows.append(row)

        vp_previo = vp
        rth_prev  = rth

    res = pd.DataFrame(rows)
    N   = len(res)
    print(f"   ✅ Sesiones válidas:      {N}")
    print(f"   ⚠️  Sesiones descartadas: {len(descartadas)}\n")

    if N < 10:
        print("❌ Muy pocas sesiones."); return

    cond_cols    = [c for c in res.columns if c in COND_LABELS]
    outcome_cols = [c for c in res.columns if c in OUTCOME_LABELS]

    # ── Segmentación ──────────────────────────────────────────────────────────
    seg_ema_encima = res[res["seg_ema"] == "ENCIMA"]
    seg_ema_debajo = res[res["seg_ema"] == "DEBAJO"]
    seg_atr_alto   = res[res["seg_atr"] == "ALTO"]
    seg_atr_bajo   = res[res["seg_atr"] == "BAJO"]

    print(f"📈 Segmentación EMA 8D:")
    print(f"   Precio encima EMA: {len(seg_ema_encima)} sesiones ({len(seg_ema_encima)/N*100:.0f}%)")
    print(f"   Precio debajo EMA: {len(seg_ema_debajo)} sesiones ({len(seg_ema_debajo)/N*100:.0f}%)")
    print(f"\n📊 Segmentación ATR 3D:")
    print(f"   ATR alto: {len(seg_atr_alto)} sesiones ({len(seg_atr_alto)/N*100:.0f}%)")
    print(f"   ATR bajo: {len(seg_atr_bajo)} sesiones ({len(seg_atr_bajo)/N*100:.0f}%)")

    atr_stats = res["atr3"].describe(percentiles=[.25,.50,.75])
    print(f"\n   ATR 3D — Q25:{atr_stats['25%']:.0f} | Q50:{atr_stats['50%']:.0f} | Q75:{atr_stats['75%']:.0f} pts")

    print(f"\n🔍 Corriendo edge discovery en 5 segmentos...")

    # ── Generar reporte ────────────────────────────────────────────────────────
    md  = f"""# AMT Edge Discovery v2 — MNQ1!
## Segmentación por ATR 3D y EMA 8D · VP calculado en Python · 30 min RTH

> **Período:** {res['fecha'].iloc[0]} → {res['fecha'].iloc[-1]}
> **Sesiones totales:** {N}
> **Filtros:** n ≥ {args.min_n}, lift ≥ {args.min_lift}
> **Segmentación:** ATR 3 días y EMA 8 días calculados sobre cierres diarios (NO son condiciones de entrada)

---

## Cuartiles del IB Range (en puntos)

| Percentil | Puntos | Clasificación |
|---|---|---|
| P10 | {np.percentile(res['ib_range'],10):.0f} pts | Mínimo histórico |
| **P33** | **{np.percentile(res['ib_range'],33):.0f} pts** | **← Umbral IB ESTRECHO** |
| P50 | {np.percentile(res['ib_range'],50):.0f} pts | Mediana (sesión típica) |
| **P67** | **{np.percentile(res['ib_range'],67):.0f} pts** | **← Umbral IB AMPLIO** |
| P90 | {np.percentile(res['ib_range'],90):.0f} pts | Día de alta volatilidad |

## Estadísticas del ATR 3 días (en puntos)

| Percentil | Puntos | Clasificación |
|---|---|---|
| P25 | {np.percentile(res['atr3'],25):.0f} pts | ATR bajo |
| **P50** | **{np.percentile(res['atr3'],50):.0f} pts** | **Mediana ATR (umbral ALTO/BAJO)** |
| P75 | {np.percentile(res['atr3'],75):.0f} pts | ATR alto |
| P90 | {np.percentile(res['atr3'],90):.0f} pts | ATR muy alto (evento macro) |

## Distribución de sesiones por segmento

| Segmento | Sesiones | % del total |
|---|---|---|
| Precio encima EMA 8D (sesgo alcista) | {len(seg_ema_encima)} | {len(seg_ema_encima)/N*100:.0f}% |
| Precio debajo EMA 8D (sesgo bajista) | {len(seg_ema_debajo)} | {len(seg_ema_debajo)/N*100:.0f}% |
| ATR 3D alto (>mediana — volatilidad alta) | {len(seg_atr_alto)} | {len(seg_atr_alto)/N*100:.0f}% |
| ATR 3D bajo (<mediana — volatilidad baja) | {len(seg_atr_bajo)} | {len(seg_atr_bajo)/N*100:.0f}% |

---
"""

    # Sección 1: Dataset completo
    print("   [1/5] Dataset completo...")
    s, e, b = seccion_edge(res, cond_cols, outcome_cols, args.min_n, args.min_lift,
        "SEGMENTO 1 — Dataset Completo (todas las sesiones)",
        "Referencia base — edge sin ningún filtro de régimen.")
    md += s

    # Sección 2: EMA encima
    print("   [2/5] EMA 8D encima...")
    s, e, b = seccion_edge(seg_ema_encima, cond_cols, outcome_cols,
        max(10, args.min_n//2), args.min_lift,
        "SEGMENTO 2 — Precio ENCIMA de la EMA 8D (sesgo alcista)",
        "El precio de cierre diario anterior estaba encima de la EMA 8 días. Sesgo macro alcista.")
    md += s

    # Sección 3: EMA debajo
    print("   [3/5] EMA 8D debajo...")
    s, e, b = seccion_edge(seg_ema_debajo, cond_cols, outcome_cols,
        max(10, args.min_n//2), args.min_lift,
        "SEGMENTO 3 — Precio DEBAJO de la EMA 8D (sesgo bajista)",
        "El precio de cierre diario anterior estaba debajo de la EMA 8 días. Sesgo macro bajista.")
    md += s

    # Sección 4: ATR alto
    print("   [4/5] ATR alto...")
    s, e, b = seccion_edge(seg_atr_alto, cond_cols, outcome_cols,
        max(10, args.min_n//2), args.min_lift,
        "SEGMENTO 4 — ATR 3D ALTO (volatilidad por encima de la mediana)",
        f"ATR 3 días > {np.percentile(res['atr3'],50):.0f} pts. Mercado en régimen de alta volatilidad.")
    md += s

    # Sección 5: ATR bajo
    print("   [5/5] ATR bajo...")
    s, e, b = seccion_edge(seg_atr_bajo, cond_cols, outcome_cols,
        max(10, args.min_n//2), args.min_lift,
        "SEGMENTO 5 — ATR 3D BAJO (volatilidad por debajo de la mediana)",
        f"ATR 3 días < {np.percentile(res['atr3'],50):.0f} pts. Mercado en régimen de baja volatilidad.")
    md += s

    md += f"\n---\n*{N} sesiones · {res['fecha'].iloc[0]} → {res['fecha'].iloc[-1]} · ATR y EMA calculados sobre cierres diarios*\n"

    Path(args.output).write_text(md)
    print(f"\n✅ Reporte guardado: {args.output}")
    print(f"   Sesiones totales: {N}")
    print(f"   EMA encima: {len(seg_ema_encima)} | EMA debajo: {len(seg_ema_debajo)}")
    print(f"   ATR alto: {len(seg_atr_alto)} | ATR bajo: {len(seg_atr_bajo)}\n")


if __name__ == "__main__":
    main()