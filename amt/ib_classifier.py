from datetime import datetime

def classify_apertura(open_price, va_previo):
    """
    Clasifica la apertura en relación al VA previo.
    va_previo: {"vah": float, "val": float, "poc": float, "rango": float}
    """
    vah = va_previo["vah"]
    val = va_previo["val"]
    va_range = va_previo["rango"]
    
    if open_price > vah + va_range * 0.5:
        return "MUY_LEJOS_ARRIBA"
    elif open_price < val - va_range * 0.5:
        return "MUY_LEJOS_ABAJO"
    elif open_price > vah:
        return "ENCIMA_VA"
    elif open_price < val:
        return "DEBAJO_VA"
    else:
        return "DENTRO_VA"

def classify_ib(ib_data, va_previo, ib_history_p33=76, ib_history_p67=116):
    """
    Clasifica el IB (09:30-10:00 CT).
    ib_data: {"high": float, "low": float, "close": float, "volume": float, "vwap": float}
    """
    ibh = ib_data["high"]
    ibl = ib_data["low"]
    ibc = ib_data["close"]
    ib_range = ibh - ibl
    
    vah = va_previo["vah"]
    val = va_previo["val"]
    
    # 1. Tamaño del IB
    if ib_range < ib_history_p33:
        clasificacion = "ESTRECHO"
    elif ib_range > ib_history_p67:
        clasificacion = "AMPLIO"
    else:
        clasificacion = "NORMAL"
        
    # 2. Confirmación
    if ibl >= vah:
        confirmacion = "CONFIRMADO_ARRIBA"
    elif ibh <= val:
        confirmacion = "CONFIRMADO_ABAJO"
    elif ib_data["open"] > vah and ibh < vah:
        confirmacion = "RECHAZA_ARRIBA"
    elif ib_data["open"] < val and ibl > val:
        confirmacion = "RECHAZA_ABAJO"
    else:
        confirmacion = "DENTRO_VA"
        
    # 3. Relación Cierre vs VA
    if ibc > vah:
        cierre_vs_va = "ARRIBA_VAH"
    elif ibc < val:
        cierre_vs_va = "ABAJO_VAL"
    else:
        cierre_vs_va = "DENTRO_VA"
        
    # 4. VWAP Slope (±0.02% threshold)
    vwap = ib_data["vwap"]
    if ibc > vwap * 1.0002:
        vwap_slope = "ALCISTA"
    elif ibc < vwap * 0.9998:
        vwap_slope = "BAJISTA"
    else:
        vwap_slope = "PLANO"
        
    return {
        "range": round(ib_range, 2),
        "clasificacion": clasificacion,
        "confirmacion": confirmacion,
        "cierre_vs_va": cierre_vs_va,
        "vwap_slope": vwap_slope,
        "toca_vah": ibh >= vah >= ibl,
        "toca_val": ibh >= val >= ibl,
        "toca_poc": ibh >= va_previo["poc"] >= ibl
    }

class IBClassifier:
    def classify_apertura(self, open_price, va_previo):
        return classify_apertura(open_price, va_previo)
    def classify_ib(self, ib_data, va_previo, p33=76, p67=116):
        return classify_ib(ib_data, va_previo, p33, p67)

