# Roadmap: Sieben

## Active Phase

### Phase 3: Nueva Arquitectura AMT (Determinística)
**Goal**: Reemplazar inferencia LLM (Jim) por Motor Python AMT y optimizar Axe.
- [ ] Motor Python: Clasificación estadística de 994 sesiones.
- [ ] Axe Redesign: Ejecutor de setups de alta convicción.
- [ ] Dashboard: Panel de setups AMT en tiempo real.




---

## Future Phases

### Phase 4: Escalabilidad de Capital y Multi-Cuenta
**Goal**: Gestionar múltiples contratos y cuentas con la misma directiva de régimen.

---

## Completed Phases

### Milestone 2: Taylor Dinámico + Aprendizaje + Wags Auditoría ✓ COMPLETADO 2026-03-13
- ✓ Taylor: Riesgo dinámico (SL, RRR, Max Trades) por exposición.
- ✓ regime_memory.py: Recuperación de lecciones históricas (Pure Python).
- ✓ Prompt: Inyección de [MEMORIA RÉGIMEN] en Jim (Plan Vuelo/Apertura).
- ✓ Wags: Auditoría de cierre con JSON estructurado y auto-guardado en lessons.
- ✓ DB: Tablas `taylor_sessions` y `wags_daily_audit`.

### Milestone 1: Sistema de Regímenes AMT ✓ COMPLETADO 2026-03-13
- ✓ MGI_RTH con exceso CONFIRMED/PARTIAL/TRUNCATED.
- ✓ MGI_IB con clasificación BALANCE/TREND_DISGUISED/AMBIGUOUS.
- ✓ relay.py: tablas `ib_daily` y `rth_daily`.
- ✓ Jim: emite `REGIME_ANALYSIS` con `nivel_exposicion` 1-4.
- ✓ Axe: filtra setups por `nivel_exposicion`.
- ✓ Memoria: tabla `lessons` enriquecida con columnas de régimen.

### Phase 2: Gestión Activa y Automatización Horaria ✓ COMPLETADO 2026-03-11
- ✓ Disparadores Temporales (08:30 / 09:30 EST).
- ✓ Contexto de Trade Activo (Jim, Axe, Taylor).

### Phase 1: Estabilización Cognitiva ✓ COMPLETADO
- ✓ Refactor de ingesta VWAP a `slice(-30)`
- ✓ Separar identidad TAYLOR_EJECUCION de TAYLOR_ACTUALIZACION
- ✓ Eliminar la repetición de tablas matemáticas de Taylor
