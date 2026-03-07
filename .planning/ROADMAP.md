# Roadmap: Sieben

## Active Phase

### Phase 2: Gestión Activa y Automatización Horaria
**Goal**: Lograr que el sistema reaccione orgánicamente a eventos de mercado y audite trades activos sin romper su lógica.

#### Plan 2.1: Implementar Disparadores Temporales (08:30 / 09:30 EST)
- [ ] Construir lógica en `useTaskScheduler.ts` o componente padre para inyectar un tag *[APERTURA]* o *[INITIAL BALANCE]* en la data de TradingView.
- [ ] Modificar `promptBuilder.ts` para que Jim y Axe prioricen este tag cuando el horario coincida.

#### Plan 2.2: Contexto de Trade Activo
- [ ] Recibir estado `activeTrade` desde el Frontend.
- [ ] Alterar instrucciones de Axe: si hay trade, Axe pasa a modo Trail Stop / Gestión en lugar de buscar entradas.
- [ ] Alterar instrucciones de Taylor: si hay trade, Taylor evalúa RRR dinámico en vez de aprobar capital virgen.

---

## Future Phases

### Phase 3: Dashboard Ejecutivo & Cierre
**Goal**: Resumen de fin de día y logging de trades.
- Evaluar métricas de desempeño de las ejecuciones aprobadas.
- Activar a Wags (CIO) para dar directrices macro del día siguiente.

---

## Completed Phases

### Phase 1: Estabilización Cognitiva
- ✓ Refactor de ingesta VWAP a `slice(-30)`
- ✓ Separar identidad TAYLOR_EJECUCION de TAYLOR_ACTUALIZACION
- ✓ Eliminar la repetición de tablas matemáticas de Taylor
