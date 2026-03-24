import numpy as np

TICK = 0.25
VA_PCT = 0.70

def calcular_vp(rth_df, tick=TICK, va_pct=VA_PCT):
    """
    Calcula VAH, VAL y POC de una sesión RTH usando barras OHLCV.
    Algoritmo extractado de amt_edge_discovery.py.
    """
    if len(rth_df) < 3: 
        return None
        
    s_hi = round(rth_df["high"].max() / tick) * tick
    s_lo = round(rth_df["low"].min()  / tick) * tick
    
    if s_hi <= s_lo: 
        return None
        
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
        if va_vol >= tgt: 
            break
        can_up = va_hi + 1 < n_levels
        can_dn = va_lo - 1 >= 0
        v_up   = vol_levels[va_hi + 1] if can_up else 0.0
        v_dn   = vol_levels[va_lo - 1] if can_dn else 0.0
        
        if can_up and can_dn and v_up == v_dn:
            va_hi += 1
            va_lo -= 1
            va_vol += v_up + v_dn
        elif can_up and (not can_dn or v_up > v_dn):
            va_hi += 1
            va_vol += v_up
        elif can_dn:
            va_lo -= 1
            va_vol += v_dn
        else: 
            break
            
    return {
        "poc": poc,
        "vah": round(s_lo + va_hi * tick, 2),
        "val": round(s_lo + va_lo * tick, 2),
        "vol_total": int(tot_vol),
        "rango": round(s_hi - s_lo, 2)
    }

def calcular_indicadores_diarios(precios_cierre, rangos_diarios):
    """
    Calcula ATR(3) y EMA(8) sobre cierres/rangos diarios.
    precios_cierre: List of daily closes
    rangos_diarios: List of daily ranges (high - low)
    """
    if not precios_cierre:
        return None
        
    n = len(precios_cierre)
    cierre_actual = precios_cierre[-1]
    
    # ATR 3 días
    atr3 = np.mean(rangos_diarios[-3:]) if n >= 3 else np.mean(rangos_diarios)
    
    # EMA 8 días
    if n == 1:
        ema8 = cierre_actual
    else:
        k = 2 / (8 + 1)
        # Simplified for incremental calculation
        # This assumes the caller provides a historical EMA if available, 
        # but here we'll just return the current session's calculation info.
        # The amt_engine will handle the stateful EMA.
        ema8 = None # To be implemented in engine state
        
    return {
        "atr3": round(float(atr3), 2),
        "cierre": cierre_actual
    }
