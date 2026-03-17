# Estado del Proyecto

## Fase Actual
**Integración de Datos y Ejecución (Fase 2) - Estabilización de flujos con Agentes**
Actualmente el proyecto está integrando la data capturada en tiempo real mediante el Relay, mapeando la arquitectura (MGI, VWAP, Nodos) y pasándola correctamente a través de los Prompts para ser procesada sin errores por la red de agentes (Jim, Taylor, Axe, Wendy, y Wags).

## Tareas Completadas
- **Ingesta y Persistencia de Datos:** Se configuró `relay.py` y se arregló la inicialización de datos para que persistan y la interfaz las cargue desde la primera petición, evitando vacíos.
- **Merge Dinámico de Polling (Relay):** Se corrigió el servidor Python (`relay.py`) para que empaquete las distintas líneas JSONL (Macro, Nodos, RTH, VWAP) leyendo hacia atrás al iniciar sesión, lo que elimina el bug de `undefined` en el Frontend durante subastas en vivo.
- **Formateador de Alta Precisión:** Se inyectó una función recursiva global `formatNumbers()` en el Prompt Builder para asegurar que **todos** los niveles de MGI inyectados a los Agentes sean recortados rígidamente a un máximo de 2 decimales evitando "spam" de números flotantes.
- **Refactorización Core de Jim:** Desvinculado de protocolos estrictos de bloqueo. Ahora infiere la subasta fluidamente y tiene obligado outputear la `Dirección: [Largo/Corto]`.
- **Refactorización Core de Taylor (Riesgo Dual):** Ahora calcula contratos basado en el MÍNIMO entre "Restricción por Riesgo" (`BRM / 1RM`) y "Restricción por Margen" (`Balance / Margen_Requerido`). Runner Targets dinámicos.
- **Refactorización Core de Wendy (Backoffice Mental):** Distingue entre fases. En el Pre-Market (Plan de Vuelo) solo audita al humano emocionalmente; no fuerza tablas falsas de Trade Log.
- **Refactorización Core de Wags (CIO Executive):** Transmutado de un loro reformateador a un sintetizador ejecutivo. Lanza la directiva "GO / NO-GO" narrativamente en 4 renglones.

## Bloqueos / Pendientes
1. **Ciclo de Vida Intra-Día (Apertura -> Cierre):** Plan de Vuelo es 100% estable. Fase paralela: Evaluar los Triggers Automáticos (`Apertura 08:30` y `Initial Balance 09:30`), el Tracking del Trade Abierto (Gestión desde la UI) y el "Shutdown" del día.
