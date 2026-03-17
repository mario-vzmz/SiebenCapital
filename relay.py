from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta
from regime_memory import get_regime_context

app = Flask(__name__)
CORS(app)

# Archivos para la base de datos histórica (JSONL para mejor rendimiento y robustez)
VWAP_FILE = 'data/vwap_price.jsonl'
MGI_FILE = 'data/mgi_data.jsonl'
DELIBERATIONS_FILE = 'data/deliberations.jsonl'
DB_FILE = 'data/sieben.db'

# Memoria de Setups y Buffer de Velas
ACTIVE_SETUPS = {} # id -> setup
CANDLE_BUFFER = [] # lista de velas 1m recientes
MAX_CANDLE_BUFFER = 60 # Hasta 60 min

# Asegurar que el directorio data existe
os.makedirs('data', exist_ok=True)

def init_db():
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        # Preserve existing db structure
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS trades (
                ClientAccountID TEXT,
                CurrencyPrimary TEXT,
                AssetClass TEXT,
                Symbol TEXT,
                Description TEXT,
                Conid TEXT,
                FIGI TEXT,
                ListingExchange TEXT,
                UnderlyingConid TEXT,
                UnderlyingSymbol TEXT,
                Multiplier REAL,
                Strike REAL,
                Expiry TEXT,
                TransactionType TEXT,
                TradeID TEXT PRIMARY KEY,
                OrderID TEXT,
                ExecID TEXT,
                BrokerageOrderID TEXT,
                OrderTime TEXT,
                Date_Time TEXT,
                ReportDate TEXT,
                SettleDate TEXT,
                TradeDate TEXT,
                Exchange TEXT,
                Buy_Sell TEXT,
                Quantity INTEGER,
                Price REAL,
                Amount REAL,
                Proceeds REAL,
                NetCash REAL,
                NetCashWithBillable REAL,
                Commission REAL,
                BrokerExecutionCommission REAL,
                ThirdPartyExecutionCommission REAL,
                ThirdPartyRegulatoryCommission REAL,
                OtherCommission REAL,
                CommissionCurrency TEXT,
                -- Custom Columns
                tipo_dia TEXT,
                nombre_setup TEXT,
                wendy_notes TEXT,
                puntos REAL,
                rs REAL,
                outcome TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lessons (
                id TEXT PRIMARY KEY,
                regime TEXT,
                setup_name TEXT,
                rule_text TEXT,
                timestamp TEXT,
                ib_regime TEXT,
                ib_confidence TEXT,
                ib_direction TEXT,
                outcome TEXT
            )
        ''')
        # Tabla nueva para IB diario
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ib_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                ib_high REAL,
                ib_low REAL,
                ib_mid REAL,
                ib_open REAL,
                ib_range REAL,
                ib_range_10m REAL,
                ib_range_20m REAL,
                ib_construction_speed REAL,
                ib_prior_poc REAL,
                ib_gravity_disp REAL,
                ib_asymmetry_ratio TEXT,
                ib_regime TEXT,
                ib_confidence TEXT,
                ib_direction TEXT
            )
        ''')
        # Tabla nueva para RTH diario (Excess)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rth_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                y_max REAL,
                y_min REAL,
                onh REAL,
                onl REAL,
                y_vah REAL,
                y_poc REAL,
                y_val REAL,
                excess_upper_pct REAL,
                excess_upper_type TEXT,
                excess_lower_pct REAL,
                excess_lower_type TEXT
            )
        ''')
        # Tabla nueva para Sesiones de Taylor
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS taylor_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                contratos_permitidos INTEGER,
                sl_maximo_pts REAL,
                rrr_minimo REAL,
                max_trades_sesion INTEGER,
                nivel_exposicion_aplicado INTEGER,
                regla_exceso_applied TEXT,
                capital_snapshot REAL
            )
        ''')
        # Tabla para Setup Activo (Persistencia de Gatillos)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS active_setup (
                id INTEGER PRIMARY KEY,
                timestamp TEXT,
                setup_name TEXT,
                direction TEXT,
                zone_price REAL,
                zone_buffer REAL DEFAULT 2.0,
                trigger_condition TEXT,
                entry_limit REAL,
                stop_loss REAL,
                take_profit REAL,
                invalidation_price REAL,
                expiry_time TEXT,
                status TEXT DEFAULT 'WAITING'
            )
        ''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error inicializando BD: {e}")

# Inicializar Base de Datos SQLite
init_db()

def save_to_jsonl(data, file_path):
    """Guarda el dato usando append en formato JSON Lines"""
    try:
        with open(file_path, 'a') as f:
            f.write(json.dumps(data) + '\n')
    except Exception as e:
        print(f"Error guardando en {file_path}: {e}")

def read_last_line(file_path):
    """Lee la última línea de un archivo JSONL de forma eficiente"""
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, 'rb') as f:
            try:
                f.seek(-2, os.SEEK_END)
                while f.read(1) != b'\n':
                    f.seek(-2, os.SEEK_CUR)
            except OSError:
                f.seek(0)
            last_line = f.readline().decode()
            return json.loads(last_line) if last_line.strip() else None
    except Exception as e:
        print(f"Error leyendo última línea de {file_path}: {e}")
        return None

# Almacén temporal en memoria para el último mensaje recibido
last_data = {
    "symbol": "WAITING",
    "price": 0,
    "vah": 0,
    "val": 0,
    "poc": 0,
    "status": "Awaiting first signal...",
    "raw_payload": "No data yet",
    "timestamp": None
}

def restore_last_state():
    """Restaura el último estado desde los archivos de datos al iniciar"""
    global last_data
    try:
        # Intentar cargar último VWAP
        last_vwap = read_last_line(VWAP_FILE)
        if last_vwap:
            last_data.update(last_vwap.get('parsed_data', {}))
            last_data["timestamp"] = last_vwap.get("timestamp")
            last_data["status"] = "RESTORING_FROM_HISTORY"
            print(f"[+] Estado VWAP restaurado: {last_data['timestamp']}")

        # Intentar cargar último MGI (Macro/RTH/NODES)
        if os.path.exists(MGI_FILE):
            with open(MGI_FILE, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        parsed = entry.get('parsed_data', {})
                        if parsed:
                            last_data.update(parsed)
                    except:
                        continue
            print(f"[+] Estado MGI restaurado por completo")
            
    except Exception as e:
        print(f"Error restaurando estado inicial: {e}")

# Llamar a la restauración inmediatamente
restore_last_state()

def get_synthesized_candle(minutes=5):
    """Agrupa las velas de 1min del buffer en una sola vela de N minutos para filtrar ruido."""
    if not CANDLE_BUFFER:
        return None
    now = datetime.now()
    # Filtrar solo las velas de los últimos 'minutes'
    recent = [c for c in CANDLE_BUFFER if datetime.fromisoformat(c['timestamp']) >= now - timedelta(minutes=minutes)]
    if not recent:
        return None
        
    synth_open = recent[0]['candle']['open']
    synth_close = recent[-1]['candle']['close']
    synth_high = max(c['candle']['high'] for c in recent)
    synth_low = min(c['candle']['low'] for c in recent)
    
    return {
        "open": synth_open,
        "high": synth_high,
        "low": synth_low,
        "close": synth_close,
        "count": len(recent),
        "start_time": recent[0]['timestamp'],
        "end_time": recent[-1]['timestamp']
    }

@app.route('/api/setups', methods=['GET', 'POST', 'DELETE'])
def handle_setups():
    global ACTIVE_SETUPS
    now = datetime.now()
    
    # 1. Limpieza Mecánica TTL (Time-to-Live)
    keys_to_delete = []
    for s_id, setup in ACTIVE_SETUPS.items():
        if 'expires_at' in setup:
            try:
                exp_dt = datetime.fromisoformat(setup['expires_at'])
                if now > exp_dt:
                    keys_to_delete.append(s_id)
            except:
                pass
    for k in keys_to_delete:
        del ACTIVE_SETUPS[k]

    if request.method == 'POST':
        payload = request.get_json()
        s_id = payload.get('id', str(uuid.uuid4()))
        
        # Inyectar TTL de 120 minutos si no viene específicado
        if 'expires_at' not in payload:
            payload['expires_at'] = (now + timedelta(minutes=120)).isoformat()
            
        payload['state'] = 'STANDBY' # Estado IDLE -> STANDBY
        payload['created_at'] = now.isoformat()
        
        ACTIVE_SETUPS[s_id] = payload
        return jsonify({"status": "success", "id": s_id, "setup": payload}), 201

    elif request.method == 'DELETE':
        setup_id = request.args.get('id')
        if setup_id in ACTIVE_SETUPS:
            del ACTIVE_SETUPS[setup_id]
            return jsonify({"status": "deleted"}), 200
        return jsonify({"error": "not found"}), 404
        
    else: # GET
        synth = get_synthesized_candle(2)
        return jsonify({
            "setups": list(ACTIVE_SETUPS.values()),
            "synth_2m": synth
        }), 200

@app.route('/api/marketdata/range', methods=['GET'])
def get_market_range_data():
    """Recupera velas de PRICE dentro de un rango de tiempo (start_iso, end_iso)"""
    start_str = request.args.get('start')
    end_str = request.args.get('end')

    if not start_str or not end_str:
        return jsonify({"error": "Missing 'start' or 'end' parameters (ISO format)"}), 400

    try:
        start_dt = datetime.fromisoformat(start_str)
        end_dt = datetime.fromisoformat(end_str)
        
        results = []
        if os.path.exists(VWAP_FILE):
            with open(VWAP_FILE, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        ts_str = entry.get('timestamp')
                        if ts_str:
                            entry_dt = datetime.fromisoformat(ts_str)
                            if start_dt <= entry_dt <= end_dt:
                                results.append(entry)
                    except:
                        continue
        
        return jsonify(results), 200

    except ValueError:
        return jsonify({"error": "Invalid date format. Use ISO 8601"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/marketdata/latest-vwap', methods=['GET'])
def get_latest_vwap():
    try:
        data = read_last_line(VWAP_FILE)
        if data:
            return jsonify(data), 200
        return jsonify({"message": "No VWAP data found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/marketdata/pre-market', methods=['GET'])
def get_pre_market():
    try:
        if not os.path.exists(MGI_FILE):
            return jsonify({"message": "No MGI data found"}), 404
        
        result = {"MGI_RTH": None, "MGI_NODES": None, "MGI_MACRO": None, "MGI_IB": None}
        missing = set(result.keys())
        
        # Leemos el archivo de atrás hacia adelante para encontrar lo más reciente de cada tipo
        with open(MGI_FILE, 'r') as f:
            lines = f.readlines()
            for line in reversed(lines):
                if not missing:
                    break
                try:
                    entry = json.loads(line)
                    parsed = entry.get('parsed_data', {})
                    if parsed:
                        for key in list(missing):
                            if key in parsed:
                                result[key] = parsed[key]
                                missing.remove(key)
                except:
                    continue
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/deliberations', methods=['POST', 'GET'])
def handle_deliberations():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            if not payload:
                return jsonify({"error": "No payload received"}), 400
            
            # Asegurar timestamp si no viene
            if "timestamp" not in payload:
                payload["timestamp"] = datetime.now().isoformat()
                
            save_to_jsonl(payload, DELIBERATIONS_FILE)
            return jsonify({"status": "success", "message": "Deliberation saved"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    else: # GET
        try:
            if not os.path.exists(DELIBERATIONS_FILE):
                return jsonify([]), 200
            
            task_id_filter = request.args.get('taskId')
            deliberations = []
            with open(DELIBERATIONS_FILE, 'r') as f:
                for line in f:
                    try:
                        d = json.loads(line)
                        if task_id_filter:
                            if d.get('taskId') == task_id_filter:
                                deliberations.append(d)
                        else:
                            deliberations.append(d)
                    except:
                        continue
            return jsonify(deliberations), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/taylor/sessions', methods=['POST', 'GET'])
def handle_taylor_sessions():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            if not payload:
                return jsonify({"error": "No payload"}), 400
                
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            sizing = payload.get('TAYLOR_SIZING', {})
            
            cursor.execute('''
                INSERT INTO taylor_sessions 
                (timestamp, contratos_permitidos, sl_maximo_pts, rrr_minimo, max_trades_sesion, nivel_exposicion_aplicado, regla_exceso_applied, capital_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                sizing.get('contratos_permitidos'),
                sizing.get('sl_maximo_pts'),
                sizing.get('rrr_minimo'),
                sizing.get('max_trades_sesion'),
                sizing.get('nivel_exposicion_aplicado'),
                sizing.get('regla_exceso_aplicada'),
                sizing.get('capital_snapshot')
            ))
            
            conn.commit()
            conn.close()
            return jsonify({"status": "success"}), 201
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else: # GET
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM taylor_sessions ORDER BY timestamp DESC LIMIT 50")
            rows = cursor.fetchall()
            conn.close()
            return jsonify([dict(row) for row in rows]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/wags/audit', methods=['POST', 'GET'])
def handle_wags_audit():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            if not payload:
                return jsonify({"error": "No payload"}), 400
                
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            audit = payload.get('WAGS_AUDIT', {})
            
            cursor.execute('''
                INSERT INTO wags_daily_audit 
                (timestamp, regime_actual, regimen_correcto_retrospectiva, nivel_exposicion_aplicado, setups_axe_count, trades_ejecutados, resultado_pnl, sistema_coherente, leccion_del_dia, recomendacion_manana)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                audit.get('regime_actual'),
                audit.get('regimen_correcto_retrospectiva'),
                audit.get('nivel_exposicion_aplicado'),
                audit.get('setups_axe_count'),
                audit.get('trades_ejecutados'),
                audit.get('resultado_pnl'),
                audit.get('sistema_coherente'),
                audit.get('leccion_del_dia'),
                audit.get('recomendacion_manana')
            ))
            
            conn.commit()
            conn.close()
            return jsonify({"status": "success"}), 201
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else: # GET
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM wags_daily_audit ORDER BY timestamp DESC LIMIT 50")
            rows = cursor.fetchall()
            conn.close()
            return jsonify([dict(row) for row in rows]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/trades', methods=['POST', 'GET'])
def handle_trades():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            if not payload:
                return jsonify({"error": "No payload received"}), 400
            
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            # Extract standard fields
            trade_id = payload.get('trade_id', f"trade-{datetime.now().timestamp()}")
            timestamp_str = payload.get('timestamp', datetime.now().isoformat())
            dt_obj = datetime.fromisoformat(timestamp_str) if 'T' in timestamp_str else datetime.now()
            
            direction = payload.get('direction', '')
            contracts = payload.get('contracts', 0)
            puntos = payload.get('puntos', 0)
            amount = puntos * contracts * 2.0  # Assumes MNQ 2 USD per point
            
            cursor.execute('''
                INSERT INTO trades 
                (TradeID, Date_Time, TradeDate, Buy_Sell, Quantity, Price, Amount, Symbol, AssetClass, CurrencyPrimary, Multiplier, tipo_dia, nombre_setup, wendy_notes, puntos, rs, outcome)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                trade_id,
                dt_obj.strftime("%Y-%m-%d %H:%M:%S"),
                dt_obj.strftime("%Y-%m-%d"),
                direction,
                contracts,
                payload.get('entry_price', 0),
                amount,
                'MNQ',
                'FUT',
                'USD',
                2.0,
                payload.get('tipo_dia', ''),
                payload.get('setup_name', ''),
                payload.get('ai_audit', ''), # Max 140 chars enforced by AI
                puntos,
                payload.get('final_r', 0),
                payload.get('outcome', '')
            ))
            
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "message": "Trade saved to DB"}), 201
            
        except sqlite3.Error as e:
            return jsonify({"error": f"Database error: {e}"}), 500
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else: # GET
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row # Para retornar dicts
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trades ORDER BY Date_Time DESC")
            rows = cursor.fetchall()
            conn.close()
            
            trades = [dict(row) for row in rows]
            return jsonify(trades), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/lessons', methods=['GET', 'POST'])
def handle_lessons():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            if not payload:
                return jsonify({"error": "No payload"}), 400
                
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            lesson_id = f"lesson-{datetime.now().timestamp()}"
            
            cursor.execute('''
                INSERT INTO lessons (id, regime, setup_name, rule_text, timestamp, ib_regime, ib_confidence, ib_direction, outcome)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                lesson_id,
                payload.get('regime', ''),
                payload.get('setup_name', ''),
                payload.get('rule_text', ''),
                datetime.now().isoformat(),
                payload.get('ib_regime', ''),
                payload.get('ib_confidence', ''),
                payload.get('ib_direction', ''),
                payload.get('outcome', '')
            ))
            
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "id": lesson_id}), 201
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    else: # GET
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM lessons ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            conn.close()
            
            lessons = [dict(row) for row in rows]
            return jsonify(lessons), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/active_setup', methods=['GET', 'POST', 'DELETE'])
def handle_active_setup():
    if request.method == 'POST':
        try:
            payload = request.get_json()
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO active_setup 
                (id, timestamp, setup_name, direction, zone_price, zone_buffer, trigger_condition, entry_limit, stop_loss, take_profit, invalidation_price, expiry_time, status)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                payload.get('setup_name'),
                payload.get('direction'),
                payload.get('zone_price'),
                payload.get('zone_buffer', 2.0),
                payload.get('trigger_condition'),
                payload.get('entry_limit'),
                payload.get('stop_loss'),
                payload.get('take_profit'),
                payload.get('invalidation_price'),
                payload.get('expiry_time'),
                'WAITING'
            ))
            conn.commit()
            conn.close()
            return jsonify({"status": "success"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == 'DELETE':
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("UPDATE active_setup SET status='CANCELLED' WHERE id=1")
            conn.commit()
            conn.close()
            return jsonify({"status": "cancelled"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    else: # GET
        try:
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM active_setup WHERE id=1")
            row = cursor.fetchone()
            conn.close()
            if row:
                return jsonify(dict(row)), 200
            return jsonify({"status": "NONE"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

def evaluate_active_setup(current_price: float, current_time: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM active_setup WHERE id=1")
        setup = cursor.fetchone()
        
        if not setup or setup['status'] in ['CANCELLED', 'EXPIRED']:
            conn.close()
            return

        # 1. Expiration
        if current_time > setup['expiry_time']:
            cursor.execute("UPDATE active_setup SET status='EXPIRED' WHERE id=1")
            conn.commit()
            conn.close()
            return

        # 2. Invalidation
        if setup['direction'] == 'LONG' and current_price < setup['invalidation_price']:
            cursor.execute("UPDATE active_setup SET status='CANCELLED' WHERE id=1")
            conn.commit()
            conn.close()
            return
        if setup['direction'] == 'SHORT' and current_price > setup['invalidation_price']:
            cursor.execute("UPDATE active_setup SET status='CANCELLED' WHERE id=1")
            conn.commit()
            conn.close()
            return

        # 3. Trigger (Zone check)
        in_zone = abs(current_price - setup['zone_price']) <= setup['zone_buffer']
        if in_zone:
            cursor.execute("UPDATE active_setup SET status='TRIGGERED' WHERE id=1")
            conn.commit()

        conn.close()
    except Exception as e:
        print(f"Error evaluating setup: {e}")

@app.route('/api/regime_context', methods=['GET'])
def handle_regime_context():
    try:
        regime = request.args.get('regime', '')
        confidence = request.args.get('confidence', '')
        direction = request.args.get('direction', '')
        
        if not regime:
            return jsonify({"error": "Missing regime parameter"}), 400
            
        context_data = get_regime_context(regime, confidence, direction)
        return jsonify(context_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET'])
@app.route('/', methods=['GET', 'POST'])
def webhook():
    global last_data

    if request.method == 'POST':
        raw_content = request.data.decode('utf-8')
        print(f"\\n[!] Señal recibida a las {datetime.now().strftime('%H:%M:%S')}")
        
        try:
            # Intento de parseo estándar
            json_data = request.get_json(force=True, silent=True)
            
            # Si el parseo estándar falla, limpieza de campos problemáticos
            if not json_data:
                try:
                    cleaned_content = raw_content.replace('\\"ticker\\":\\"={', '\\"ticker\\":\\"skipped\\", \\"raw_ticker\\":\\"').replace('}\\",', '\\",')
                    json_data = json.loads(cleaned_content)
                except:
                    json_data = None

            # Preparar el objeto para guardar
            current_entry = {
                "timestamp": datetime.now().isoformat(),
                "raw_payload": raw_content,
                "parsed_data": json_data if json_data else None,
                "status": "JSON_SUCCESS" if json_data else "PLAIN_TEXT"
            }

            if json_data:
                keys = json_data.keys()
                
                # Actualizar el estado global con Smart Merge ANTES de guardar
                for key, value in json_data.items():
                    if isinstance(value, dict) and key in last_data and isinstance(last_data[key], dict):
                        last_data[key].update(value)
                    else:
                        last_data[key] = value

                # Si es un payload de VOLUME directo, inyectarlo al PRICE y guardarlo
                if "VOLUME" in keys:
                    if "PRICE" not in last_data or not isinstance(last_data["PRICE"], dict):
                        last_data["PRICE"] = {}
                    last_data["PRICE"]["VOLUME"] = json_data["VOLUME"]
                    
                    # Forzar grabado para el histórico de PRICE actualizado
                    current_entry["parsed_data"] = {"PRICE": last_data["PRICE"]}
                    save_to_jsonl(current_entry, VWAP_FILE)
                
                # Si llega de forma convencional
                elif "PRICE" in keys:
                    # Inyectar el VOLUME conocido a la data actual antes de guardar
                    if "VOLUME" in last_data.get("PRICE", {}):
                        json_data["PRICE"]["VOLUME"] = last_data["PRICE"]["VOLUME"]
                        current_entry["parsed_data"] = json_data
                    
                    # Evaluar Setup Activo (Persistencia)
                    price_close = json_data.get("PRICE", {}).get("candle", {}).get("close")
                    if price_close:
                        evaluate_active_setup(price_close, current_entry["timestamp"])

                    # Agregar las velas 1m al Buffer de Síntesis
                    candle = json_data.get("PRICE", {}).get("candle")
                    if candle:
                        global CANDLE_BUFFER
                        CANDLE_BUFFER.append({
                            "timestamp": current_entry["timestamp"], 
                            "candle": candle
                        })
                        # Truncar para prevenir desborde
                        if len(CANDLE_BUFFER) > MAX_CANDLE_BUFFER:
                            CANDLE_BUFFER = CANDLE_BUFFER[-MAX_CANDLE_BUFFER:]

                    save_to_jsonl(current_entry, VWAP_FILE)

                if any(k in keys for k in ["MGI_RTH", "MGI_NODES", "MGI_MACRO", "MGI_IB"]):
                    save_to_jsonl(current_entry, MGI_FILE)
                    
                    # Persistencia en SQLite para MGI_RTH y MGI_IB
                    if "MGI_RTH" in keys:
                        rth = json_data["MGI_RTH"]
                        try:
                            conn = sqlite3.connect(DB_FILE)
                            cursor = conn.cursor()
                            cursor.execute('''
                                INSERT INTO rth_daily 
                                (timestamp, y_max, y_min, onh, onl, y_vah, y_poc, y_val, excess_upper_pct, excess_upper_type, excess_lower_pct, excess_lower_type)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                current_entry["timestamp"],
                                rth.get('Y_MAX'), rth.get('Y_MIN'), rth.get('ONH'), rth.get('ONL'),
                                rth.get('Y_VAH'), rth.get('Y_POC'), rth.get('Y_VAL'),
                                rth.get('EXCESS_UPPER_PCT'), rth.get('EXCESS_UPPER_TYPE'),
                                rth.get('EXCESS_LOWER_PCT'), rth.get('EXCESS_LOWER_TYPE')
                            ))
                            conn.commit()
                            conn.close()
                        except Exception as db_e:
                            print(f"Error saving MGI_RTH to DB: {db_e}")

                    if "MGI_IB" in keys:
                        ib = json_data["MGI_IB"]
                        try:
                            conn = sqlite3.connect(DB_FILE)
                            cursor = conn.cursor()
                            cursor.execute('''
                                INSERT INTO ib_daily 
                                (timestamp, ib_high, ib_low, ib_mid, ib_open, ib_range, ib_range_10m, ib_range_20m, ib_construction_speed, ib_prior_poc, ib_gravity_disp, ib_asymmetry_ratio, ib_regime, ib_confidence, ib_direction)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ''', (
                                current_entry["timestamp"],
                                ib.get('IB_HIGH'), ib.get('IB_LOW'), ib.get('IB_MID'), ib.get('IB_OPEN'),
                                ib.get('IB_RANGE'), ib.get('IB_RANGE_10M'), ib.get('IB_RANGE_20M'),
                                ib.get('IB_CONSTRUCTION_SPEED'), ib.get('IB_PRIOR_POC'),
                                ib.get('IB_GRAVITY_DISP'), ib.get('IB_ASYMMETRY_RATIO'),
                                ib.get('IB_REGIME'), ib.get('IB_CONFIDENCE'), ib.get('IB_DIRECTION')
                            ))
                            conn.commit()
                            conn.close()
                        except Exception as db_e:
                            print(f"Error saving MGI_IB to DB: {db_e}")
                
                last_data["parsed_data"] = json_data 
                last_data["status"] = "JSON_SUCCESS"
            else:
                last_data["status"] = "PLAIN_TEXT_RECEIVED"

            last_data["raw_payload"] = raw_content
            last_data["timestamp"] = current_entry["timestamp"]

            return jsonify({"status": "success", "message": "Data routed and merged"}), 200

        except Exception as e:
            print(f"Error procesando señal: {e}")
            return jsonify({"status": "error", "message": str(e)}), 400

    else:
        # GET request
        unified_parsed = {}
        latest_ts = None
        
        # Obtener el último PRICE
        vwap_entry = read_last_line(VWAP_FILE)
        if vwap_entry:
            parsed = vwap_entry.get('parsed_data', {})
            if 'PRICE' in parsed:
                unified_parsed['PRICE'] = parsed['PRICE']
            elif 'VWAP_PRICE' in parsed: # Retrocompatibilidad
                unified_parsed['PRICE'] = parsed['VWAP_PRICE']
            latest_ts = vwap_entry.get('timestamp')
        
        # Obtener los componentes MACRO, RTH, NODES e IB leyendo hacia atrás
        if os.path.exists(MGI_FILE):
            missing = {"MGI_RTH", "MGI_NODES", "MGI_MACRO", "MGI_IB"}
            mgi_ts = None
            with open(MGI_FILE, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines):
                    if not missing:
                        break
                    try:
                        entry = json.loads(line)
                        parsed = entry.get('parsed_data', {})
                        if parsed:
                            for key in list(missing):
                                if key in parsed:
                                    unified_parsed[key] = parsed[key]
                                    missing.remove(key)
                                    if mgi_ts is None:
                                        mgi_ts = entry.get('timestamp')
                    except:
                        continue
            
            if mgi_ts and (not latest_ts or mgi_ts > latest_ts):
                latest_ts = mgi_ts

        if not latest_ts:
            latest_ts = last_data.get("timestamp")
            
        response_data = {
            "status": "JSON_SUCCESS" if unified_parsed else last_data.get("status", "WAITING"),
            "timestamp": latest_ts,
            "parsed_data": unified_parsed
        }

        response = jsonify(response_data)
        response.headers.add('ngrok-skip-browser-warning', 'true')
        return response

if __name__ == '__main__':
    print("--- RELAY DE DATOS MGI (API ENDPOINTS ACTIVOS) ---")
    port = int(os.environ.get('PORT', 5000))
    # En Cloud Run, el puerto suele ser 8080 pero se pasa por variable
    app.run(host='0.0.0.0', port=port, debug=False)
