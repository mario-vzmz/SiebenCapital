import json
import os
from datetime import datetime
from .vp_calculator import calcular_vp, calcular_indicadores_diarios
from .ib_classifier import classify_apertura, classify_ib
from .setup_matcher import SetupMatcher

class AMTEngine:
    def __init__(self, catalog_path="data/setup_catalog.json"):
        self.matcher = SetupMatcher(catalog_path)
        self.va_previo = None
        self.atr_3d = None
        self.ema8 = None

    def initialize_from_db(self, db_conn):
        """
        Hydrate historical context (previous VA, ATR, EMA) from SQLite.
        """
        # To be implemented with real SQL queries
        pass

    def run_fase1(self, current_price, va_previo):
        """
        Executed at 09:30 CT (Opening).
        """
        self.va_previo = va_previo
        clasificacion_apertura = classify_apertura(current_price, va_previo)
        
        return {
            "apertura": current_price,
            "va_previo": va_previo,
            "clasificacion_apertura": clasificacion_apertura
        }

    def run_fase2(self, ib_data, va_previo, atr_3d):
        """
        Executed at 10:00 CT (IB Close).
        """
        self.va_previo = va_previo
        self.atr_3d = atr_3d
        
        # 1. Classify IB
        ib_classification = classify_ib(ib_data, va_previo)
        
        # 2. Match Setup
        # Prepare state for matcher
        state = {
            "clasificacion_apertura": classify_apertura(ib_data["open"], va_previo),
            "confirmacion": ib_classification["confirmacion"],
            "vwap_slope": ib_classification["vwap_slope"],
            "clasificacion": ib_classification["clasificacion"],
            "cierre_vs_va": ib_classification["cierre_vs_va"],
            "gap_tipo": "ALCISTA" if ib_data.get("gap", 0) > 2 else "BAJISTA" if ib_data.get("gap", 0) < -2 else "NINGUNO",
            "ib_vol_alto": ib_data.get("ib_vol_alto", False)
        }
        
        setup_match = self.matcher.find_match(state)
        
        if setup_match:
            targets = self.matcher.calculate_targets(setup_match, ib_classification["range"], atr_3d)
            # Conviccion based on bateo
            bateo = setup_match["estadisticas"]["bateo"]
            conviccion = "MAXIMA" if bateo >= 1.0 else "ALTA" if bateo >= 0.85 else "MODERADA"
            
            setup_result = {
                "id": setup_match["id"],
                "nombre": setup_match["nombre"],
                "outcome_predicho": setup_match["estadisticas"]["outcome"],
                "bateo_historico": bateo,
                "n_sesiones": setup_match["estadisticas"]["n_sesiones"],
                "conviccion": conviccion,
                "accion_sugerida": setup_match["accion"],
                "nivel_entrada": ib_data["low"] if "SHORT" in setup_match["accion"] else ib_data["high"],
                "target_q50": round(ib_data["low"] - targets["q50"] if "SHORT" in setup_match["accion"] else ib_data["high"] + targets["q50"], 2),
                "target_q75": round(ib_data["low"] - targets["q75"] if "SHORT" in setup_match["accion"] else ib_data["high"] + targets["q75"], 2),
                "target_q90": round(ib_data["low"] - targets["q90"] if "SHORT" in setup_match["accion"] else ib_data["high"] + targets["q90"], 2),
                "stop_sugerido": round(ib_data["low"] + targets["stop"] if "SHORT" in setup_match["accion"] else ib_data["high"] - targets["stop"], 2)
            }
        else:
            setup_result = None
            
        return {
            "ib_classification": ib_classification,
            "setup": setup_result
        }
