# Sieben: El Compañero Cognitivo de Trading

## What This Is

Sieben no es un bot de Alta Frecuencia (HFT) ni un trader autónomo; es un compañero cognitivo diseñado para forzar disciplina y elocuencia analítica en el usuario. Evalúa la microestructura del mercado de futuros en tiempo real (MGI, VWAP, Nodos Volumen) y transita por un flujo de análisis estructurado utilizando agentes especializados para asegurar que el trader siga secuencias de trabajo lógicas y no emocionales.

## Core Value

Mantener al trader sujeto a un proceso analítico estricto respaldado por datos estadísticos determinísticos; la precisión procedimental y la reducción de latencia cognitiva son prioridades.


## Requirements

### Validated

- ✓ [Motor Base] — Ingesta de JSONL vía TradingView (Macro, Nodos, RTH, VWAP).
- ✓ [Sincronización Dinámica] — Merge y envío de 30 velas históricas ("Slice") para evitar amnesia de LLM.
- ✓ [Orquestación de Agentes] — Pipeline jerárquico (Jim -> Axe -> Taylor -> Wendy -> Wags).
- ✓ [Interfaz Reactiva] — Polling continuo a 100hz sin saturar el frontend (AgentFeed).
- ✓ [Gestión de Trade Activo] — Lectura y seguimiento algorítmico cuando una orden "Go" ha sido aprobada.
- ✓ [Sistema de Regímenes AMT] — Jim REGIME_ANALYSIS, Axe filtrado por exposición y persistencia de MGI_IB/RTH.
- ✓ [Taylor Dinámico] — Cálculo de parámetros de riesgo (SL, RRR, max trades) por nivel de exposición.
- ✓ [Sistema de Aprendizaje] — Jim recibe memoria histórica de lecciones filtradas por régimen (Pure Python Context).
- ✓ [Wags Dashboard] — Auditoría de régimen al cierre, auto-guardado de lecciones y persistencia en SQLite.

### Active

- [Optimización de UI] — Dashboard avanzado de control de riesgo y visualización de lecciones históricas.
- [Backtesting de Regímenes] — Comparar la directiva de Wags vs el resultado real para ajustar niveles de exposición.

### Out of Scope

- [Ejecución Autónoma Directa] — Sieben opina, recomienda y frena, pero la responsabilidad y click final (por ahora) pertenece al humano.
- [Análisis Multi-Día Profundo LLM] — Delegado a scripts, para mantener la ventana de tokens enfocada y reactiva en la sesión actual.

## Context

- **Tech Stack:** Frontend en React/Vite (TSX), Backend en Python Flask recibiendo Webhooks de TradingView (enrutados por ngrok).
- **LLM Backbone:** Google Gemini / Claude APIs; la ingeniería de prompts (`systemInstructions.ts`) es el alma de la aplicación.
- **Estado Actual:** Nueva Arquitectura AMT Inicializada (Fase 1: Motor Python).




## Constraints

- **Ventana de Tokens:** Toda inyección de datos (VWAP/Nodos) debe ser truncada (`formatNumbers(2)`) y re-banada (`slice(-30)`) para evitar que el LLM delire o el costo se dispare.
- **Velocidad de Polling:** El frontend debe leer el backend local asíncronamente; si ngrok o los scripts de Python caen, la app se detiene.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separación Práctica de Taylor | Evitar re-calculos matemáticos repetitivos cuando solo se necesita actualización estructural (TAYLOR_ACTUALIZACION). | ✓ Done |
| Polling en Cliente | Evita la complejidad de WebSockets para un prototipo rápido, y delega a Python el merge de archivos planos. | ✓ Good |
| Memoria Sin LLM | El resumen de régimen se genera vía Python puro para ahorrar tokens y latencia. | ✓ Good |

---
*Last updated: 2026-03-13 tras completar Milestone 2 (Taylor Dinámico + Aprendizaje + Wags Audit).*
