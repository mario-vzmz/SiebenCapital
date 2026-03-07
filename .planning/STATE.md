---
project: Sieben
phase: 2
---

# Project State: Sieben

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** Mantener al trader sujeto a un proceso analítico estricto y elocuente dictado por algoritmos de contexto y secuencias de tiempo; la disciplina procedimental importa más que la velocidad de ejecución.
**Current focus:** Phase 2: Gestión Activa y Automatización Horaria

## Current Status

- Fase 1 de Estabilización Cognitiva (mitigación de amnesia y de redundancia en Taylor) completada satisfactoriamente.
- Fase 2 de Gestión Activa inicializada con The Station Roadmap.
- Esperando inicio de sprint para la automatización de la campana de apertura y la auditoría dinámica del RRR ante un trade precargado en el payload.

## Open Threads

- ¿Cómo se conectará el Frontend con el Webhook para diferenciar "no hay trade" de "trade activo" a nivel del input de TradingView?
- ¿El horario de las 08:30 / 09:30 lo debe calcular el Frontend (con `new Date()`) o vendrá inyectado desde el script de Python?
