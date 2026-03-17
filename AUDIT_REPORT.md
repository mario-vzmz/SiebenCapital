# Auditoría del Sistema MNQ Market Intelligence OS

## 1. Estado Actual del Sistema
El sistema se encuentra funcional en una etapa de prototipo monolítico.
- **Ubicación del Código**: Toda la lógica y la interfaz de usuario residen en un único archivo: `index.tsx` (397 líneas).
- **Fase 1 (Ingesta)**: ✅ Implementada. La función `handleDataIngest` procesa el JSON y consulta a Gemini para generar el tablero MGI.
- **Fase 2 (Lógica de Agentes)**: ⚠️ Parcialmente implementada. La lógica de los agentes (Jim, Taylor, Axe, Wendy, Wags) reside exclusivamente en *prompts* de texto (`PHASE_2_INSTRUCTION`), no en código ejecutable.

## 2. Hallazgos Críticos

### A. Arquitectura (Riesgo Alto)
El archivo `index.tsx` contiene:
1.  Configuración de la API de Google GenAI.
2.  Definición de prompts maestros.
3.  Lógica de estado (React useState).
4.  Renderizado de UI (Header, Sidebar, Main).
5.  Estilos (Tailwind classes hardcodeadas).

**Problema**: Al tener todo en un solo archivo, es muy difícil para la IA (y para un humano) mantener la consistencia de la UI mientras se edita la lógica. Cualquier cambio en la lógica de los agentes corre el riesgo de "romper" accidentalmente un cierre de etiqueta HTML o una clase CSS.

### B. Lógica de Agentes "Simulada"
Actualmente, "Taylor Mason" (Risk Manager) es solo una instrucción de texto para el LLM:
> "CALCULA: (Puntos Stop * $2 USD). Veto si Riesgo > $500 USD..."

**Riesgo**: Si el LLM alucina o comete un error matemático, el sistema "aprobará" operaciones riesgosas.
**Recomendación**: La lógica de riesgo (freno de mano) debe ser código TypeScript determinista, no una petición a la IA. La IA debe *proponer*, pero el código debe *validar*.

### C. Discrepancias UI/UX vs Especificaciones
Según `docs/UI_UX_SPECS.md`:
-   **Sieben Treasury**: Se especifica como "Collapsible" (plegable) con "backdrop-blur".
-   **Implementación actual**: Es un `div` estático en el sidebar (líneas 239-259). No es plegable y su estilo es básico.

## 3. Plan de Acción Recomendado

Para solucionar el problema de "la UI cambia constantemente", se recomienda una **Refactorización Modular**:

1.  **Separar Componentes**:
    -   Crear `components/SiebenTreasury.tsx`
    -   Crear `components/MGIDashboard.tsx`
    -   Crear `components/AgentOutput.tsx`
2.  **Migrar Lógica ("Hardening")**:
    -   Convertir las reglas de Taylor Mason (Riesgo) a una función TypeScript pura que valide los números antes de siquiera llamar a la IA.
    -   Estructurar la respuesta de los agentes como JSON, no como texto libre, para poder renderizar una UI bonita y predecible.

## 4. Conclusión
El sistema tiene una base sólida pero necesita una reestructuración arquitectónica inmediata para poder avanzar a la Fase 3 con estabilidad. La "inteligencia" está ahí, pero el "cuerpo" (el código) es demasiado frágil.
