# Requirements: Sieben

## Core Value
Mantener al trader sujeto a un proceso analítico estricto y elocuente dictado por algoritmos de contexto y secuencias de tiempo; la disciplina procedimental importa más que la velocidad de ejecución.

---

## 🏗 Roadmap Alignment

### Phase 1: Estabilización Cognitiva (Completado)
* **Goal**: Garantizar que Jim, Axe y Taylor no alucinen por exceso de datos y entiendan sus roles sin solaparse.
- ✓ [REQ-01] Limitar historial VWAP a 30 velas asíncronas
- ✓ [REQ-02] Separar a Taylor en modos: EJECUCION vs ACTUALIZACION
- ✓ [REQ-03] Eliminar tablas repetitivas en los reportes markdown

### Phase 2: Gestión Activa y Automatización Horaria (Current)
* **Goal**: Lograr que el sistema reaccione orgánicamente a eventos de mercado y sea capaz de auditar un trade en curso.
- [ ] [REQ-04] Automatización Horaria: Disparar flujos fijos a las 08:30 y 09:30 EST.
- [ ] [REQ-05] Auditoría de Trade Activo: Input del Frontend (`activeTrade=true`) altera el prompt de Axe y Taylor.

### Phase 3: Dashboard Ejecutivo
* **Goal**: Cierre de sesión y métricas de desempeño narradas por Wags.
- [ ] [REQ-06] Resumen de Shutdown: Wags y Wendy evalúan el P&L y la psique del trader al final del día.
- [ ] [REQ-07] Persistencia de Trade Logs en base de datos local SQLite.
