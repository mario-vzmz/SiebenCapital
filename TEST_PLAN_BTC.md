# Plan de Prueba de Conexión (Modo BTC - Node.js & Python Relay)

Este documento detalla el procedimiento para validar la ingesta de datos en tiempo real desde TradingView (BTCUSD) hacia el sistema MNQ Market Intelligence OS.

## 1. Arquitectura de Prueba
*   **Fuente de Datos**: Alerta de TradingView (Webhook).
*   **Túnel**: Ngrok (Expone puerto local 5000 a Internet).
*   **Relay (Backend)**: Script Python (`relay.py`) con Flask. Recibe el Webhook y guarda en `data/history.json`.
*   **Frontend**: React App (Vite/Node.js). Consulta al Relay cada 2 segundos.

## 2. Pasos de Ejecución

### Paso A: Iniciar el Relay (Backend)
⚠️ **IMPORTANTE**: Debes activar el entorno virtual donde instalamos Flask.
```bash
source venv/bin/activate && python3 relay.py
```
*Si ves "--- RELAY DE DATOS MGI (CON HISTORIAL) ---", está funcionando.*

### Paso B: Iniciar el Túnel
En una **nueva terminal**:
```bash
./ngrok http 5000
```
*Copia la URL HTTPS que genera (ej: `https://xxxx.ngrok-free.app`).*

### Paso C: Iniciar la App (Frontend)
En una **tercera terminal**:
```bash
npm run dev
```
*Abre `http://localhost:5173` en tu navegador.*

### Paso D: Configurar Alerta en TradingView
1.  Ve a un gráfico de **BTCUSD**.
2.  Crea una alerta.
3.  **Webhook URL**: Pega tu URL de Ngrok.
4.  **Mensaje (Body)**: Copia y pega este JSON EXACTO (basado en tu indicador):

```json
{
  "ticker": "BTC_TEST_STREAM",
  "candle": {
    "close": {{close}},
    "high": {{high}},
    "low": {{low}},
    "open": {{open}}
  },
  "rth_prev": {
    "max": {{high}},
    "min": {{low}},
    "poc": {{close}},
    "vah": {{high}},
    "val": {{low}}
  },
  "overnight": {
    "onh": {{high}},
    "onl": {{low}}
  },
  "shape": {
    "day": "Test Day",
    "week": "Test Week"
  },
  "nodes": {
    "hvns_5d": [{{close}}, {{open}}],
    "lvns_5d": [{{low}}, {{high}}]
  },
  "macro": {
    "atr_15m": 33.5,
    "atr_3d": 517.0,
    "vix": 17.25
  },
  "volume": {
    "t1": 1500000,
    "t2": 2000000,
    "sma20": 1800000
  }
}
```
*Nota: TradingView reemplazará `{{close}}`, `{{high}}`, etc. con precios reales de BTC.*

## 3. Verificación de Éxito
1.  Cuando salte la alerta, mira tu App (Sidebar izquierdo).
2.  Debes ver el cuadro **"Live Data Stream"** aparecer con datos.
3.  El botón cambiará a **"Trading Plan"**.
4.  Al darle clic, Gemini generará un análisis basado en esos datos de BTC.
