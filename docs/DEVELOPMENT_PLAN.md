# Plan de Desarrollo: Trader Discipline Companion

## Fase 1: Data Tunnel & MGI Ingestion (COMPLETADA Y REFORZADA)
**Objetivo:** Establecer una tubería de datos robusta, persistente y visible desde TradingView hasta el Dashboard React.

### Componentes Implementados:
-   **Alerta TradingView (Fuente):** Configuración de Webhook con payload JSON complejo (Precios, VIX, Day Shape, Volume Profile).
-   **Ngrok Tunneling:** Exposición segura del puerto local 5000 a Internet (`ngrok http 5000`).
-   **Python Relay (`relay.py`):**
    -   Servidor Flask intermedio para recibir Webhooks.
    -   **Persistencia Histórica:** Almacenamiento automático de cada señal en `data/history.json`.
    -   Exposición de datos vía API REST (`GET /`) para el frontend.
-   **Frontend Integration (React):**
    -   Sistema de "Polling" en `index.tsx` para leer datos del Relay cada 2s.
    -   **Indicador de Conexión:** Widget de estado (Connected/Waiting/Offline) en la UI.
    -   **Live Data Inspector:** Visor de JSON RAW en tiempo real en la barra lateral para depuración.

## Fase 2: Brain Integration (COMPLETADA - LÓGICA V3)
- **Engine 1 (Jim):** Estratega. [OK] - Ahora utiliza datos reales del Relay (no simulados).
- **Engine 2 (Taylor):** Risk Manager. [OK]
- **Engine 3 (Axe):** Ejecutor. [OK]
- **Engine 4 (Wendy):** Coach/Auditora. [OK]
- **Engine 5 (Wags):** CIO/Orquestador. [OK]
- **Alignment:** Integración del Bloque 0: Constitución y Filosofía Core. [OK]

## Fase 3: Pruebas de Integración & QA (EN CURSO)
- **Modo Prueba BTC:** Validación de flujo de datos 24/7 usando criptomonedas. [ACTIVO]
- **Simulation Mode:** Inyección de escenarios críticos para validación de agentes. [OK]
- **Chain Validation:** Verificación de que Wags detecta inconsistencias entre Jim y Axe. [TESTING]
- **Stress Test:** Validación de límites de Taylor Mason con balances variables. [TESTING]

## Fase 4: Feedback Loop & Journaling (PRÓXIMA)
- Almacenamiento de Directivas en Base de Datos para Journaling Automático.
- Análisis de sesgos recurrentes (Analytics).