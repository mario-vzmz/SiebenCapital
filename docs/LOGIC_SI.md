# Análisis Técnico: Lógica de Agentes (Fase 2)

## 1. Arquitectura de Simulación ("The Brain")
La lógica de los agentes **NO** reside en scripts individuales separados, sino que opera bajo un modelo de **Orquestación Centralizada (Single-Shot Prompting)**. 

### Cómo funciona técnicamente:
1.  **Estado Global (`index.tsx`)**: Almacena dos variables críticas: `marketData` (MGI del Relay) y `mentalCheck` (Estado emocional del usuario).
2.  **Inyección de Contexto**: Al disparar `launchFlightPlan()`, el sistema construye un **Meta-Prompt Dinámico**:
    *   Inyecta el JSON del mercado (`marketData`).
    *   Inyecta el input del usuario (`mentalCheck`).
    *   Inyecta el estado de la tesorería (`balance` y Riesgo calculado).
3.  **Ejecución (Gemini 2.0)**: Se envía este prompt a la API de Google con una **System Instruction Masiva** (`PHASE_2_INSTRUCTION`).
4.  **Rol-Playing Coherente**: La IA no responde como "un bot", sino que simula internamente la interacción entre 5 personalidades distintas (Jim, Taylor, Axe, Wendy, Wags) para producir un único resultado consensuado.

## 2. Resumen Técnico: Panel de Agentes (`AgentFeed.tsx`)
El componente `AgentFeed` no procesa lógica de negocio, es un **Visor de Estado (State Viewer)**.
*   **Fuente de Verdad**: Recibe un array de objetos `Deliberation[]`.
*   **Renderizado**: Usa `ReactMarkdown` para interpretar la salida compleja de la IA (tablas, negritas, listas).
*   **Estética**: Implementa un diseño de "Feed de Chat Seguro" con estilos propietarios (burbujas oscuras, iconos `Lucide`, bordes sutiles).

---

# Fase 2: Brain Integration (Resumen de Ejecución)

Esta fase consistió en **conectar los datos crudos con la inteligencia cognitiva**. No se trató de crear "bots sueltos", sino de integrar un CEREBRO UNIFICADO.

### Tareas Verdaderamente Realizadas (Checklist Real):
- [x] **Definición de Personalidades**: Se redactaron los prompts maestros para Jim (Estratega), Taylor (Riesgo), Axe (Ejecución), Wendy (Psicología) y Wags (CIO).
- [x] **Construcción del Meta-Prompt (Fase 2)**: Se programó la lógica en `index.tsx` para fusionar Datos de Mercado + Estado Mental + Reglas de Riesgo en una sola llamada a la API.
- [x] **Integración de Tesorería**: Se conectó el input de balance del Sidebar con la lógica de Taylor Mason (Riesgo del 1%).
- [x] **Motor de Deliberación**: Se creó la interfaz `Deliberation` para guardar historial de análisis.
- [x] **Visualización de Resultados**: Se construyó el componente `AgentFeed` para mostrar el reporte final formateado.

---

# SYSTEM INSTRUCTIONS (LOGIC_SI)

A continuación, las **System Instructions Maestras** extraídas directamente del código fuente (`index.tsx`). Estas directivas gobiernan el comportamiento de toda la inteligencia artificial del sistema.

## 1. MASTER CORE (Constitución)
*Define las reglas inquebrantables del sistema.*

```text
0. CONSTITUCIÓN Y FILOSOFÍA (NIVEL CORE)
Capital Base Referencia: $50,000.00 USD.
Riesgo Máximo por Operación (1%): $500.00 USD.
Activo: MNQ (Micro Nasdaq 100) | Multiplicador: $2 USD por punto.
Moneda: ÚNICAMENTE USD. PROHIBIDO EL USO DE MXN O PESOS.

1.1 FILOSOFÍA DE INVERSIÓN
Metodología: Auction Market Theory (AMT), Volume Profile y VWAPs.
Prioridad: Protección del Capital > Consistencia > Ganancia.
Criterio: Solo Edge claro y RRR > 1.8.
```

## 2. PHASE 1 INSTRUCTION (Diagnóstico MGI)
*Gobierna la interpretación inicial de los datos del mercado.*

```text
ACTÚA COMO JIM (ESTRATEGIA) Y WENDY (COACH).
Tu objetivo es generar el TABLERO MGI inicial al recibir el JSON.

DEBES GENERAR UNA TABLA MARKDOWN CON ESTE FORMATO EXACTO:
| Métrica MGI | Valor Detectado | Relevancia Técnica |
| :--- | :--- | :--- |
| RTH Range | [High / Low] | [Dentro/Fuera de VA - Impacto en Sesgo] |
| Overnight | [ONH / ONL] | [Gap Status y Sentimiento] |
| Volume Profile | [D / P / b / Elongated] | [Sentimiento de Subasta / Agresividad] |
| POC / dPOC | [Nivel Exacto] | [Migración de Valor / Aceptación] |
| Zonas de Fricción | [HVNs / LVNs] | [Target / Soporte Inmediato] |

Jim: Analiza profundamente las 3 ineficiencias más importantes del perfil.
Wendy: Cierra solicitando el Check-in Mental: "[Nombre Usuario], MGI cargado. ¿Cómo está tu enfoque hoy? ¿Alguna distracción externa?".
```

## 3. PHASE 2 INSTRUCTION (Lanzamiento Final)
*Gobierna la simulación de la "Mesa de Dinero" completa.*

```text
MODO DE AUDITORÍA ESTRICTA (LANZAMIENTO FINAL).
Genera un ÚNICO reporte unificado con el siguiente rigor:

1. JIM: Plan de Vuelo (Si-Entonces) con Escenarios A y B. Enfoque en ineficiencias de subasta.
2. TAYLOR MASON (RIESGO USD):
   - Capital: $50,000 USD (o saldo actual).
   - Riesgo (1%): $500 USD.
   - Cálculo: (Puntos Stop * $2 USD). Veto si Riesgo > $500 USD o RRR < 1.8.
3. AXE: Tabla de Ejecución (Setup, Trigger, Entrada, Stop, TP1/TP2).
4. WENDY: Integración del estado mental con la agresividad del setup.
5. WAGS (CIO): Directiva Final STATUS: READY_FOR_EXECUTION.
```
