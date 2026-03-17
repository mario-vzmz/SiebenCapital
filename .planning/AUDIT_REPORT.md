# 📊 Reporte de Auditoría Quant: Sistema Sieben

**Alcance:** Lógica de Agentes (Axe, Jim, Taylor) y Backend (relay.py)
**Contexto:** Se procedió a auditar el manejo de flujo de datos y microestructura (`relay.py`) junto al Motor Racional de la IA (`src/systemInstructions.ts` y `src/utils/promptBuilder.ts`), que fungen como el cerebro backend del sistema.

## 1. Mapa de Setups (Catálogo Estricto de Axe)

| Setup | Dirección (Dir) | Zona de Caza (POI) | Gatillo / Filtro | Lógica de Salida (TP/SL) |
|---|---|---|---|---|
| **VWAP Fade** (Solo Días Balance) | Contrario al movimiento (Fader) | **2SD / 3SD VWAP**. Niveles de sobre-extensión del RTH. | Absorción. (El precio frena con MGI denso). | **TP:** Retorno al VWAP_RTH o 1SD. **SL:** Máx 40 pts. |
| **Pullback Estructural** (Solo Días Tendencia) | A favor de la tendencia | **VWAP central o 1SD** a favor del flujo. | Delta alineado a la tendencia tras el rechazo. | **TP:** Extensión continua (3R a 5R). **SL:** Máx 40 pts. |
| **Breakout / Iniciativa** (Solo Días Tendencia) | A favor de la tendencia | **Ruptura de Y-VAH / Y-VAL** o Extremos. | Delta Masivo (Rompimiento con agresión intencional). | **TP:** Extensión continua. **SL:** Máx 40 pts. |
| **Liquidación Overnight** (Balance o Reversión) | Fader | **Sweep de ONH / ONL**. | Regreso rápido y fuerte dentro del valor. | **TP:** Retorno a VWAP_RTH o POC. **SL:** Máx 40 pts. |

## 2. Factores de Decisión (El Motor de 3 Pasos)

Antes de sugerir el setup anterior, el sistema (`AXE`) obliga a la IA a pasar por este filtro:

1. **Filtro Direccional (Estructura de Jim):** Verifica el Tipo de Día determinado matemáticamente por Jim (Tendencia vs Balance). Prohíbe cruzarlos (ej. está inquebrantablemente vetado operar un Breakout en un día de Balance).
2. **Confluencia de POI (Nodos MGI):** Axe busca niveles confluentes y evita zonas vacías. Usa niveles de Campana de Gauss (Desviaciones Estándar como 1SD, 2SD) y valores previos (Y-VAH/Y-VAL). Está expresamente prohibido usar el precio actual como Zonas de Interés (POI).
3. **Paso 3 - La Cinta (Microestructura y Volumen):**
   - *¿Filtros de Volumen?* Sí. Axe exige "Momentum" (Delta a favor) o "Absorción" (Delta masivo detenido). Se le instruyó ignorar los *dojis* de 1 minuto ("Chop").
   - *¿Filtros de Hora?* Sí. En `promptBuilder.ts`, el sistema envía "Alertas de Sistema" para inyectar contexto a las aperturas macro (07:30 CST) y la campana de acciones institucional (08:30 CST / 09:30 EST), ordenándole priorizar volatilidad de apertura y vetando entradas en horarios muertos ("Chop").

## 3. Análisis de Tiempo, TTL y Latencia

El backend `relay.py` tiene dos mecanismos críticos relacionados al tiempo operativo:

- **Síntesis de Velas (El Delay Controlado):** `relay.py` usa la función `get_synthesized_candle(2)` para empaquetar velas de 1 minuto en velas agrupadas de 2 minutos. 
  - *🔴 Riesgo de Latencia (Latency):* El backend usa `datetime.now() - timedelta(minutes=2)` del **reloj local** de tu computadora para calcular cuáles velas agarrar del Buffer, en lugar de usar estrictamente los timestamps absolutos del Webhook de TradingView. Si hay un *drift* (desfase) de segundos/minutos entre tu reloj local de Mac y los servidores de TradingView, algunas velas podrían descartarse erróneamente, empaquetando un grupo huérfano.
- **Manejo del TTL (Time-To-Live):** Los Setups que sugiere Axe se guardan con un estado "STANDBY" y se les inyecta un parámetro de muerte natural llamado `expires_at` (TTL).
  - El TTL está incrustado mediante la instrucción `now + timedelta(minutes=120)`. Si el gatillo táctico no ocurre en **2 horas**, el setup se cancela solo en el backend.

## 4. Detección de "Hard-coding" (Números Mágicos y Limitantes Estáticas)

Audité la base de código y localicé varias variables estáticas (Hard-coded) que deberían ser variables dinámicas si el sistema escala: 

1. **El Limitante del P&L (Multiplier = 2.0):** En `relay.py`, la operación aritmética para subir los trades a SQL asume estrictamente `amount = puntos * contracts * 2.0`. Esto está cimentado de por vida para el mercado Micro (MNQ). Si un día decides operar minis NQ (20 USD por punto) usando el mismo sistema, reportará tus P&L mal porque están anclados a x2.
2. **El Stop Loss Inquebrantable (40 pts):** Axe tiene incrustado en su prompt maestro: *"NINGÚN STOP_LOSS PUEDE EXCEDER 40 PTS."* Nunca pondrá 41, sin importar cuán salvaje esté la volatilidad del día.
3. **El Contexto Horario Central (07:30 a.m.):** En `promptBuilder.ts`, la lógica IF inyecta alertas de Pre-mercado asumiendo que el servidor corre en tu misma zona (CST), evaluando `if baseDate.getHours() === 7...`. Si un día mudamos el `.py` a la nube de AWS (ej. horario de Virginia/UTC), las inyecciones de las alertas se romperán por desfase local.
4. **TTL Fijo (120 mins):** El TTL de las "emboscadas" no distingue de liquidez; siempre serán 2 horas. Sería más poderoso que Axe pudiera dictaminar el TTL (ej: "Expira en 15 minutos porque el rechazo debe ser veloz").
5. **Amnesia Parcial de Cinta (30 velas):** En `promptBuilder.ts`, el historial del Vector OHLC se reduce a `recentVwaps.slice(-30)`. Los agentes asimilarán la lectura perfecta de cinta para los últimos 30 minutos de vida. Cualquier clímax de absorción más allá de 30 minutos atrás sale de su campo visual activo.

## Glosario para el Usuario (No-Coder)

- **Hard-coding (Cimentado en Piedra):** Mala práctica de escribir números directamente en el código fuente en lugar de obtenerlos de variables que se puedan cambiar desde la interfaz (ej. Escribir 40 puntos en lugar de tener un botón en la UI para ajustar el stop dinámico).
- **TTL (Time to Live):** El tiempo de caducidad. El cronómetro en retroceso que rige cuantas horas o minutos está válido un setup pendiente del agente antes de morir por antigüedad en el libro de órdenes.
- **Drift / Latency (Desfase):** Falla técnica de sincronización entre relojA y relojB. Produce en este sistema que velas que ocurren a la 1:30 PM en los servidores mundiales, lleguen aquí y sean marcadas a la 1:31 PM por tu procesador local.
- **1SD / 2SD:** Primera y Segunda Desviación Estándar de la campana estadística. Es la orilla normal de la alberca de los precios, usada inmensamente por los institucionales para identificar sobre-compra.
