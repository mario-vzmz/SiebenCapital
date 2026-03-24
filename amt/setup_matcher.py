import json
import os

class SetupMatcher:
    def __init__(self, catalog_path="data/setup_catalog.json"):
        self.catalog_path = catalog_path
        self.catalog = self._load_catalog()

    def _load_catalog(self):
        if not os.path.exists(self.catalog_path):
            return {"setups": [], "stat_context": {}}
        with open(self.catalog_path, 'r') as f:
            return json.load(f)

    def find_match(self, current_state):
        matches = []
        for setup in self.catalog["setups"]:
            is_match = True
            for key, expected_value in setup["condiciones"].items():
                if current_state.get(key) != expected_value:
                    is_match = False
                    break
            
            if is_match:
                matches.append(setup)
        
        if not matches:
            return None
            
        matches.sort(key=lambda x: (x["estadisticas"]["bateo"], x["estadisticas"]["n_sesiones"]), reverse=True)
        return matches[0]

    def calculate_targets(self, setup, ib_range, atr_3d):
        ctx = self.catalog.get("stat_context", {})
        
        if setup.get("target_type") == "UP":
            factors = ctx.get("target_factors_up", {"q25": 0, "q50": 0.38, "q75": 1.0, "q90": 1.68})
        else:
            factors = ctx.get("target_factors_down", {"q25": 0, "q50": 0.31, "q75": 0.94, "q90": 1.75})
            
        stop_factor = ctx.get("stop_factor_atr", 0.30)
        
        targets = {
            "q50": ib_range * factors["q50"],
            "q75": ib_range * factors["q75"],
            "q90": ib_range * factors["q90"],
            "stop": atr_3d * stop_factor
        }
        return targets
