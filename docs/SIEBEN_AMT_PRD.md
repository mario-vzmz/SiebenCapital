# PRD: Sieben Capital — Nueva Arquitectura AMT
## Motor Python + Inyección de Contexto + Rediseño de Agentes

> **Para usar con GSD:** Ejecuta `/gsd:new-project` en Antigravity y proporciona este archivo como PRD cuando te lo solicite, o ejecuta directamente `/gsd:map-codebase` primero para que GSD entienda el codebase existente, luego `/gsd:new-milestone` referenciando este documento.

---

## Contexto del Proyecto

**Proyecto:** Sieben Capital — Sistema multi-agente de trading para MNQ (Micro E-mini Nasdaq-100 Futures)
**Stack actual:** React + Vite + TypeScript (frontend), Python + Flask (relay.py backend), Google Gemini 2.0 Flash (IA), SQLite (persistencia), TradingView webhooks (datos de mercado)
**Repositorio:** `/Users/mariov/Documents/app`
**Desplegado en:** Firebase Hosting (frontend) + Google Cloud Run (backend)

**Problema que resuelve esta nueva arquitectura:**
El sistema actual inyecta ~4,000 tokens de datos crudos a los agentes LLM en cada sesión. Los agentes infieren el setup AMT en lugar de recibirlo ya calculado. Jim (agente LLM) hace trabajo que debería hacer código determinístico. El resultado: latencia alta, errores 429 frecuentes, sin respaldo estadístico, y lógica duplicada entre prompts y riskEngine.ts.

**Solución:** Separar el análisis estadístico (Motor Python AMT) del razonamiento de decisión (agentes IA). El motor calcula el setup antes de que llegue a cualquier agente. Los agentes reciben ~350 tokens de JSON digerido en lugar de 4,000 tokens de datos crudos.

---

## Objetivo Principal

Implementar un Motor Python AMT que clasifique el setup de cada sesión RTH con respaldo estadístico de 994 sesiones históricas (4 años), eliminar el agente Jim como LLM y reemplazarlo por código determinístico, y simplificar el prompt de Axe para que sea un ejecutor de setups en lugar de un analista.

---

## Usuarios y Contexto Operativo

**Usuario único:** Mario — trader de MNQ que opera de lunes a viernes, sesión RTH (09:30–16:00 CT).
**Momento crítico de uso:** 10:00–10:05 CT — cuando el Initial Balance cierra y el setup se puede clasificar.
**Flujo de trabajo actual:** TV genera webhooks → relay.py los recibe → frontend muestra contexto → usuario activa agentes manualmente → Jim analiza → Axe propone setup → Taylor calcula sizing → usuario ejecuta manualmente en su plataforma de broker.

---

## Requerimientos

### V1 — Motor AMT Python (MUST HAVE)

**AMT-001** — Módulo `vp_calculator.py`
Calcular VAH, VAL y POC de una sesión RTH usando barras OHLCV de 30 minutos. Algoritmo CME estándar con bins de 1 tick (0.25 pts). Distribuir volumen de cada barra uniformemente entre sus ticks. VA = 70% del volumen total expandiendo desde el POC.

El código base ya existe en `amt_edge_discovery.py` — extraer y modularizar la función `calcular_vp()`.

Inputs: DataFrame con columnas `time, open, high, low, close, volume` filtrado a sesión RTH (09:30–16:00 CT, America/Chicago).
Outputs: `{"poc": float, "vah": float, "val": float, "vol_total": int, "rango": float}`

**AMT-002** — Módulo `ib_classifier.py`
Clasificar el Initial Balance (09:30–10:00 CT) en relación al VA previo.

Fase 1 (09:30 CT — apertura):
- Calcular gap vs cierre previo
- Clasificar apertura: `ENCIMA_VA`, `DEBAJO_VA`, `DENTRO_VA`, `MUY_LEJOS_ARRIBA` (>50% VA range sobre VAH), `MUY_LEJOS_ABAJO` (>50% VA range bajo VAL)
- Detectar proximidad a VAH, VAL, POC

Fase 2 (10:00 CT — cierre del IB):
- Calcular IB range (IBH - IBL)
- Clasificar IB: `ESTRECHO` (<P33 histórico=76pts), `NORMAL` (P33-P67), `AMPLIO` (>P67=116pts)
- Detectar confirmación: `CONFIRMADO_ARRIBA` (IBL >= VAH), `CONFIRMADO_ABAJO` (IBH <= VAL), `RECHAZA_ARRIBA`, `RECHAZA_ABAJO`, `DENTRO_VA`
- Calcular VWAP del IB: `(sum(close * volume) / sum(volume))` → slope: `ALCISTA`, `BAJISTA`, `PLANO` (±0.02% umbral)
- Detectar si IB toca VAH, VAL, POC
- Calcular ATR 3 días y EMA 8 días sobre cierres diarios

**AMT-003** — Setup Catalog `data/setup_catalog.json`
Base de datos estática con los 100+ setups del edge discovery. Cada entrada:

```json
{
  "id": "ib_confirma_abajo_vwap_plano",
  "nombre": "IB confirmó abajo + VWAP plano",
  "condiciones": {
    "ib_confirmacion": "CONFIRMADO_ABAJO",
    "vwap_slope": "PLANO"
  },
  "estadisticas": {
    "outcome": "cierra_debajo_va",
    "bateo": 1.00,
    "baseline": 0.37,
    "lift": 2.68,
    "n_sesiones": 31
  },
  "accion": "SHORT en breakout del IBL",
  "target_q50_factor": 0.31,
  "target_q75_factor": 0.94,
  "target_q90_factor": 1.75,
  "stop_factor_atr": 0.30,
  "prioridad": 1
}
```

Setups obligatorios a incluir (extraídos del análisis de 994 sesiones):

BAJISTAS (outcome: cierra_debajo_va):
- `ib_confirma_abajo_vwap_plano`: bateo 100%, n=31
- `ib_confirma_abajo`: bateo 90%, n=226
- `gap_bajista_ib_confirma_abajo`: bateo 92%, n=219
- `apertura_lejos_abajo_ib_confirma_abajo`: bateo 92%, n=201
- `ib_confirma_abajo_vwap_bajista`: bateo 93%, n=82
- `ib_confirma_abajo_estrecho`: bateo 92%, n=72
- `ib_cierra_bajo_val_vwap_plano`: bateo 97%, n=37
- `apertura_lejos_abajo_estrecho`: bateo 93%, n=69

ALCISTAS (outcome: cierra_encima_va):
- `ib_confirma_arriba_vwap_alcista_normal`: bateo 98%, n=50
- `ib_confirma_arriba_vwap_alcista`: bateo 95%, n=139
- `apertura_lejos_arriba_ib_confirma_arriba_vwap_alcista`: bateo 96%, n=120
- `ib_confirma_arriba`: bateo 88%, n=292
- `apertura_lejos_arriba_ib_confirma_arriba`: bateo 89%, n=250
- `gap_alcista_ib_confirma_arriba_vwap_alcista`: bateo 95%, n=136

RUPTURA IBH (outcome: rompe_ibh):
- `apertura_dentro_va_vwap_alcista_estrecho`: bateo 97%, n=31
- `ib_toca_vah_vwap_alcista_estrecho`: bateo 97%, n=33
- `vwap_alcista_estrecho`: bateo 91%, n=164

RUPTURA IBL (outcome: rompe_ibl):
- `ib_cierra_bajo_val_vwap_bajista_estrecho`: bateo 92%, n=36
- `apertura_debajo_val_vwap_bajista_estrecho`: bateo 91%, n=34

TREND DAY (outcome: trend_day):
- `gap_alcista_vwap_bajista_estrecho`: bateo 79%, n=67
- `apertura_encima_vah_vwap_bajista_estrecho`: bateo 79%, n=56

**AMT-004** — Módulo `setup_matcher.py`
Comparar el setup detectado por `ib_classifier.py` contra el catálogo. Retornar el mejor match con todas sus métricas.

Lógica de matching:
1. Filtrar setups cuyas condiciones coincidan exactamente con el estado actual del mercado
2. Si hay múltiples matches, ordenar por: bateo DESC, n_sesiones DESC
3. Si no hay match exacto, buscar el setup más cercano (subset de condiciones)
4. Calcular targets en puntos absolutos: `target_pts = factor × ib_range`
5. Calcular stop en puntos: `stop_pts = stop_factor_atr × atr_3d`

**AMT-005** — Motor principal `amt_engine.py`
Orquestador que integra todos los módulos y genera el `setup_json` final.

```python
class AMTEngine:
    def run_fase1(self, rth_data, vp_previo) -> dict  # 09:30 CT
    def run_fase2(self, ib_data, rth_data, vp_previo) -> dict  # 10:00 CT
    def generate_setup_json(self) -> dict  # JSON completo para Axe
```

Output final `setup_json`:
```json
{
  "sesion": "2026-03-24",
  "timestamp_generado": "2026-03-24T10:01:00-05:00",
  "fase1": {
    "apertura": 24100.0,
    "cierre_previo": 24280.0,
    "gap": -180.0,
    "clasificacion_apertura": "MUY_LEJOS_ABAJO",
    "vah_previo": 24550.0,
    "val_previo": 24133.0,
    "poc_previo": 24302.0,
    "va_range": 417.0,
    "distancia_val": -33.0
  },
  "fase2": {
    "ib_high": 24180.0,
    "ib_low": 24098.0,
    "ib_range": 82.0,
    "ib_clasificacion": "ESTRECHO",
    "ib_confirmacion": "CONFIRMADO_ABAJO",
    "ib_cierra": 24110.0,
    "ib_cierra_vs_va": "ABAJO_VAL",
    "vwap_ib": 24135.0,
    "vwap_slope": "PLANO",
    "toca_vah": false,
    "toca_val": false,
    "toca_poc": false
  },
  "setup": {
    "id": "ib_confirma_abajo_vwap_plano",
    "nombre": "IB confirmó abajo + VWAP plano",
    "outcome_predicho": "cierra_debajo_va",
    "bateo_historico": 1.00,
    "baseline": 0.37,
    "lift": 2.68,
    "n_sesiones": 31,
    "conviccion": "MAXIMA",
    "accion_sugerida": "SHORT en breakout del IBL",
    "nivel_entrada": 24098.0,
    "target_q50": 24060.0,
    "target_q75": 23996.0,
    "target_q90": 23954.0,
    "stop_sugerido": 24161.0
  },
  "contexto": {
    "atr_3d": 210.0,
    "ema8_sesgo": "DEBAJO",
    "ib_range_percentil": "P25",
    "evento_macro_hoy": false
  }
}
```

**AMT-006** — Endpoint Flask `/api/amt/setup`
Agregar a `relay.py` un endpoint que:
- GET `/api/amt/setup` → retorna el último `setup_json` generado
- POST `/api/amt/trigger` → activa manualmente el motor para una fecha/hora específica
- El setup_json se persiste en `data/amt_setups.jsonl` para histórico

**AMT-007** — Scheduler `amt_scheduler.py`
Cron job que corre de lunes a viernes:
- 09:25 CT: cargar datos del día anterior de `sieben.db`, inicializar el motor
- 09:30 CT: ejecutar Fase 1, guardar resultado parcial
- 10:00 CT: ejecutar Fase 2, generar `setup_json` final
- 10:01 CT: escribir en endpoint, notificar al dashboard

Usar la librería `schedule` de Python. El scheduler debe correr como proceso independiente o como thread dentro de `relay.py`.

Zona horaria: America/Chicago. El scheduler debe manejar correctamente el cambio horario verano/invierno.

**AMT-008** — Tests de validación histórica
Suite de tests que valida el motor contra las 994 sesiones históricas del archivo `MNQ_4years.csv`.

Para las 10 sesiones más recientes, comparar:
- Setup detectado por el motor vs setup del edge discovery
- VAH/VAL/POC calculado vs valor de referencia
- Clasificación de IB vs clasificación manual

El motor debe tener >95% de precisión en la clasificación de setups vs el edge discovery.

---

### V2 — Rediseño del Prompt de Axe (MUST HAVE)

**AXE-001** — Nuevo system prompt de Axe
Reemplazar el prompt actual de Axe para que sea un ejecutor de setups estadísticos, no un analista.

Prompt base nuevo:
```
Eres Axe, el ejecutor táctico de Sieben Capital.

Tu única función es tomar decisiones de timing y entrada basadas en el setup_json que recibes del Motor AMT. El análisis ya fue hecho — tú ejecutas.

REGLAS ABSOLUTAS:
- Solo operas cuando el setup tiene bateo_historico >= 0.85
- Si conviccion es "MAXIMA" (bateo 100%), sizing completo
- Si conviccion es "ALTA" (bateo 85-99%), sizing estándar
- Si conviccion es "MODERADA" (bateo 70-84%), sizing reducido (50%)
- Si no hay setup detectado, no operas

PARA CADA SETUP RECIBIDO, RESPONDE SOLO CON:
{
  "decision": "OPERAR" | "NO_OPERAR" | "ESPERAR",
  "razon": "string breve",
  "entry": { "tipo": "LIMIT" | "STOP", "nivel": float, "zona": string },
  "sizing_recomendado": "COMPLETO" | "ESTANDAR" | "REDUCIDO",
  "notas_timing": "string opcional sobre CVD o tape"
}
```

**AXE-002** — Reducción de contexto de Axe
Modificar `promptBuilder.ts` para que Axe reciba:
- El `setup_json` del Motor AMT (350 tokens)
- Últimas 3 barras de CVD/Delta para timing (solo si setup está activo)
- Sin datos macro crudos, sin diagnóstico de Jim, sin VWAP bands SD

**AXE-003** — Eliminar dependencia de Jim
Jim ya no debe ser llamado como agente LLM. El `regime_memory.py` puede seguir existiendo como módulo Python consultado por el motor AMT (no por Jim LLM).

Modificar el flujo del orchestrator para que:
1. Motor AMT genera `setup_json` ← **nuevo primer paso**
2. Axe recibe `setup_json` ← reemplaza a "Jim → Axe"
3. Taylor recibe veredicto de Axe
4. Wags audita la cadena

---

### V3 — Scheduler Automático e Integración Dashboard (MUST HAVE)

**SCHED-001** — Dashboard: panel de setup activo
Agregar al dashboard de React un panel que muestre el `setup_json` actual con:
- Semáforo de convicción: ROJO (sin setup), AMARILLO (moderado), VERDE (alto), VERDE BRILLANTE (máxima)
- Nombre del setup detectado
- Bateo histórico y n de sesiones
- Targets Q50, Q75, Q90 en puntos
- Stop sugerido
- Countdown hasta el próximo trigger del scheduler (09:30 o 10:00)

El panel debe hacer polling al endpoint `/api/amt/setup` cada 30 segundos (no 2 segundos — reducir carga).

**SCHED-002** — Notificación push al dashboard
Cuando el motor genera el `setup_json` a las 10:01 CT, hacer push al dashboard sin esperar el polling. Implementar con Server-Sent Events (SSE) en Flask o con el WebSocket ya existente si hay uno.

**SCHED-003** — Log de setups históricos
Persistir cada `setup_json` en `data/amt_setups.jsonl` con timestamp. El dashboard debe poder mostrar los últimos 5 setups del día actual.

---

### V4 — API de Broker Tradovate (NICE TO HAVE — implementar después de 30 sesiones en vivo)

**BROKER-001** — Integración Tradovate API
Conectar con la API REST de Tradovate para envío de órdenes semi-automático.
- SDK: `tradovate-api` Python (https://github.com/tradovate/example-api-python)
- Autenticación: OAuth2 con refresh token persistido en `.env`
- Modo paper trading primero, live trading solo con flag explícito

**BROKER-002** — Order Manager `order_manager.py`
Módulo para gestión de órdenes:
- `place_entry(setup_json, sizing)` → coloca LIMIT order en el nivel de entrada
- `place_stop(position_id, nivel_stop)` → coloca STOP order
- `cancel_all()` → cancela todas las órdenes pendientes (Kill Switch)
- Log de todas las órdenes en SQLite

**BROKER-003** — Kill Switch integrado
Si el drawdown del día supera 3x el stop sugerido del primer setup, `order_manager.py` llama a `cancel_all()` y el scheduler no genera más órdenes ese día. Taylor valida el Kill Switch antes de cada orden.

---

## Arquitectura Técnica

### Archivos nuevos a crear

```
/Users/mariov/Documents/app/
├── amt/
│   ├── __init__.py
│   ├── amt_engine.py          # Motor principal
│   ├── vp_calculator.py       # Cálculo de VP (extraer de amt_edge_discovery.py)
│   ├── ib_classifier.py       # Clasificación IB y apertura
│   ├── setup_matcher.py       # Match de setup vs catálogo
│   └── amt_scheduler.py       # Cron job
├── data/
│   ├── setup_catalog.json     # Catálogo de 100+ setups
│   └── amt_setups.jsonl       # Log histórico de setups
├── tests/
│   └── test_amt_engine.py     # Tests de validación histórica
└── MNQ_4years.csv             # Ya existe — datos históricos para validación
```

### Archivos existentes a modificar

```
relay.py                       # Agregar endpoints /api/amt/setup y /api/amt/trigger
src/utils/promptBuilder.ts     # Actualizar prompt de Axe para consumir setup_json
src/components/                # Agregar panel de setup activo al dashboard
```

### Archivos existentes a NO modificar en V1

```
src/utils/riskEngine.ts        # Taylor no cambia
data/sieben.db                 # Schema no cambia
systemInstructions.ts          # Solo cambiar prompt de Axe (AXE-001)
```

---

## Flujo de Datos — Antes vs Después

### ANTES (sistema actual)
```
TradingView → Webhook → relay.py → JSONL
→ Frontend (polling 2s)
→ Usuario activa Jim manualmente
→ Jim (LLM, ~3,000 tokens): analiza VAH/VAL/POC, infiere régimen, define POIs
→ Axe (LLM, ~2,000 tokens): busca setup en catálogo de 12 setups
→ Taylor: valida RRR
→ Wags: audita
→ Usuario ejecuta manualmente
```

### DESPUÉS (nueva arquitectura)
```
TradingView → Webhook → relay.py → JSONL (sin cambio)
→ amt_scheduler.py (cron job automático):
    09:30 → amt_engine.Fase1() → setup_json parcial
    10:00 → amt_engine.Fase2() → setup_json FINAL (350 tokens)
→ Dashboard muestra setup_json automáticamente
→ Axe (LLM, ~400 tokens): recibe setup_json, decide timing
→ Taylor: valida sizing con setup_json
→ Wags: audita cadena
→ Usuario ejecuta manualmente (V1-V3) o broker API (V4)
```

---

## Métricas de Éxito

| Métrica | Actual | Objetivo V1-V3 |
|---|---|---|
| Tokens por sesión (total) | ~4,000 | <800 (-80%) |
| Latencia setup a dashboard | Varios segundos | <5 segundos |
| Intervención manual para iniciar | Sí | No (scheduler) |
| Respaldo estadístico del setup | Ninguno | 994 sesiones, bateo 88-100% |
| Jim como agente LLM | Activo | Eliminado |
| Errores 429 | Frecuentes | Reducidos >80% |

---

## Restricciones y Decisiones de Diseño

1. **No cambiar el schema de SQLite** — `sieben.db` mantiene su estructura actual
2. **No cambiar la arquitectura de webhooks de TradingView** — `relay.py` sigue recibiendo los mismos payloads
3. **El Motor AMT es determinístico** — mismo input produce siempre el mismo output. Sin LLM en el motor.
4. **El scheduler es opt-in** — Se puede activar/desactivar sin afectar el resto del sistema
5. **Compatibilidad con el sistema actual** — Durante V1 y V2, el sistema antiguo (con Jim) debe seguir funcionando como fallback
6. **El `setup_catalog.json` es inmutable en V1** — Se actualiza manualmente después de cada análisis mensual de edge discovery
7. **Zona horaria crítica** — America/Chicago. Todo timestamp en el motor debe usar esta zona. CDT (UTC-5) en verano, CST (UTC-6) en invierno.
8. **Solo sesiones RTH** — 09:30–16:00 CT. El motor ignora datos pre-market y post-market.

---

## Contexto Estadístico para el Setup Catalog

Los valores a usar en `setup_catalog.json` vienen del análisis de 994 sesiones RTH del MNQ1! de marzo 2022 a marzo 2026:

**Percentiles del IB Range:**
- P10: 53 pts
- P33: 76 pts ← umbral IB ESTRECHO
- P50: 95 pts ← mediana
- P67: 116 pts ← umbral IB AMPLIO
- P90: 181 pts

**Potencial de extensión post-IB (IB confirmó arriba, n=292):**
- Q25: 0.00x IB (= 0 pts)
- Q50: 0.38x IB (= ~34 pts) ← target conservador
- Q75: 1.00x IB (= ~84 pts) ← target clásico AMT
- Q90: 1.68x IB (= ~119 pts) ← target excepcional

**Potencial de extensión post-IB (IB confirmó abajo, n=226):**
- Q25: 0.00x IB
- Q50: 0.31x IB (= ~38 pts)
- Q75: 0.94x IB (= ~102 pts)
- Q90: 1.75x IB (= ~179 pts)

**ATR 3 días:**
- P25: 157 pts
- P50: 199 pts ← mediana
- P75: 256 pts
- P90: 328 pts

**Regla de stop:** `stop_pts = 0.30 × ATR_3D`

---

## Plan de Fases para GSD Roadmap

### Fase 1 — Motor Python AMT (2-3 semanas)
Construir y validar los módulos `vp_calculator.py`, `ib_classifier.py`, `setup_catalog.json`, `setup_matcher.py`, `amt_engine.py`, endpoint Flask `/api/amt/setup`.

Criterio de done: el motor genera un `setup_json` correcto para las últimas 10 sesiones históricas con >95% de precisión vs el edge discovery. Los tests pasan.

### Fase 2 — Rediseño de Axe (1 semana)
Actualizar el prompt de Axe para consumir `setup_json`. Eliminar Jim como agente LLM del flujo principal. Actualizar `promptBuilder.ts`.

Criterio de done: Axe recibe `setup_json` de 350 tokens, responde con JSON estructurado en <3 segundos, sin llamar a Jim.

### Fase 3 — Scheduler y Dashboard (1 semana)
Implementar `amt_scheduler.py` con triggers automáticos a las 09:30 y 10:00 CT. Agregar panel de setup activo al dashboard con semáforo de convicción. Implementar SSE para push al dashboard.

Criterio de done: el sistema corre una sesión completa sin intervención manual. El dashboard muestra el setup antes de las 10:05 CT.

### Fase 4 — API Broker Tradovate (2-4 semanas, después de 30 sesiones en vivo)
Integrar `order_manager.py` con Tradovate API. Implementar Kill Switch. Paper trading primero.

Criterio de done: el sistema envía una orden de entry LIMIT + stop STOP automáticamente en <30 segundos post-breakout, con el sizing calculado por Taylor.

---

## Notas para el Agente de GSD

Al ejecutar `/gsd:map-codebase` antes de iniciar, prestar atención especial a:
- `relay.py` — servidor Flask central, aquí se agregan los nuevos endpoints
- `src/utils/promptBuilder.ts` — aquí se construyen los prompts de los agentes, aquí se modifica Axe
- `data/sieben.db` — schema de SQLite, no modificar
- `amt_edge_discovery.py` — contiene `calcular_vp()` que se extrae para `vp_calculator.py`
- `src/utils/riskEngine.ts` — no modificar en V1-V3

La función `calcular_vp()` en `amt_edge_discovery.py` ya está implementada y validada. Extraerla como módulo independiente es el primer paso de la Fase 1.

El archivo `MNQ_4years.csv` contiene los datos históricos (columnas: `time, open, high, low, close, Volume`). Usarlo para los tests de validación en AMT-008.

