# MNQ Market Intelligence OS (v4.4.0)

Sistema avanzado de toma de decisiones para Trading de Futuros (MNQ) basado en **Market Generated Information (MGI)** y la metodología de **Jim Dalton**.

## 📊 Estado del Proyecto: FASE 1 COMPLETADA
- **Ingesta de Datos (MGI Tunnel):** [OK] Conexión estable vía Ngrok con TradingView.
- **Persistencia (TSDB):** [OK] Almacenamiento local en serie de tiempo (IndexedDB).
- **Visualización Estructural:** [OK] Dashboard de 5 días, Volúmenes y Perfiles.
- **Engine 1 (Jim):** [OPERATIVO] Análisis de contexto y sesgo.

## 🛠️ Próximos Pasos: FASE 2 (Operational Intelligence)
- **Engine 2 (Axe):** Clasificación de aperturas (Gap, Inside, Open Drive).
- **Engine 3 (Taylor):** Gestión de riesgo dinámica basada en ATR y Saldo.
- **Engine 4 (Wendy):** Formulario de psicología pre-mercado y multiplicadores de riesgo.

## 📁 Estructura de Documentación
- `docs/SYSTEM_INSTRUCTIONS.md`: Prompts expertos para los agentes.
- `docs/PHASE_2_SPECS.md`: Especificación técnica de los próximos módulos.
- `docs/DATA_INPUTS.md`: Mapeo de campos del Pine Script.
