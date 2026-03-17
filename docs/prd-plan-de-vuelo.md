# PRD: Task 1 - Plan de Vuelo (Pre-Market)

## 1. Resumen Ejecutivo
El "Plan de Vuelo" es el reporte base generado por el *Trading Desk* (Jim, Taylor, Wendy, Wags) antes de la apertura del mercado (Pre-Market). Es considerado un "Homework" obligatorio para el trader. Su objetivo es establecer un contexto claro (si-entonces) basado en MGI, determinar los riesgos permitidos (contratos máximos) operativos del día y evaluar el estado cualitativo del trader. Aquí **NO hay ejecución de operaciones** (Axe no participa activamente).

## 2. Inputs Estrictos
El sistema requiere inyectar los siguientes datos al prompt sin esfuerzo manual por parte del usuario:
*   **Datos de Mercado (Desde Relay/JSONL):**
    *   `VWAP_PRICE.candle.close` (Precio Actual Pre-Apertura).
    *   `MGI_MACRO` (Shape anterior, VIX, ATR, Volumen).
    *   `MGI_RTH` (Y_MAX, Y_MIN, Y_VAH, Y_VAL, Y_POC, ONH, ONL).
    *   `MGI_NODES` (HVNs, LVNs, POCs a 5 días).
*   **Datos Financieros (Ingresados en UI Sidebar):**
    *   Saldo de la Cuenta.
    *   Drawdown Máximo Esperado (%).
    *   Margen requerido por contrato (Ej. $3000).
    *   *Nota Interna de Taylor*: Stop Sistemático = 40 pts ($80 USD por contrato MNQ).
*   **Perfil Psicológico (Modal UI de Wendy):**
    *   Estado Emocional (Descripción breve).
    *   Nivel de Energía (Bajo / Medio / Alto).
    *   Distracciones (Presencia de externos).

## 3. Flujo Lógico y Roles (Cadena de Agentes)

### A. Jim (El Analista - DMC-1)
*   **Función:** Toma el *Precio Actual* y lo contrasta contra `Y_VAH` / `Y_VAL`. Determina si el mercado abre en **Balance** (dentro del rango) o **Tendencia/Desequilibrio** (fuera del rango).
*   **Salida Esperada:** Hipótesis lógicas "Si-Entonces" entregando niveles de precio exactos a observar (Ej. "Si respeta POC 18100, entonces buscar rechazo"). Define el *Hard Stop Lógico*.

### B. Taylor (Risk Manager)
*   **Función:** Calcula el tamaño máximo de la posición.
*   **Lógica de Cálculo (Función Interna de App/Prompt):**
    1.  Calcula Drawdown Monetario Máximo Esperado (DME) = Saldo * Drawdown %.
    2.  Calcula Riesgo 1R Sistemático = 40 puntos * $2 = $80 USD.
    3.  Calcula Contratos Máximos (Riesgo) = `floor(DME / 80)`.
    4.  Aplica Restricción de Margen: Revisa que `Contratos * Margen_Por_Contrato <= Saldo`. Ajusta hacia abajo si no cumple el colchón.
*   **Salida Esperada:** Dictamen de cuántos contratos se aprueban para operar hoy y presupuesto de Drawdown. Tiene autoridad de debatir stops amplios con Jim.

### C. Wendy (Performance Coach)
*   **Función:** Analiza el input psicológico del UI.
*   **Restricción:** No tiene capacidad de veto en Pre-Market.
*   **Salida Esperada:** Un diagnóstico cualitativo emitiendo un consejo de impacto positivo (paciencia, foco) para la sesión.

### D. Wags (CIO / Orquestador)
*   **Función:** Sintetiza el plan y lo entrega al usuario en el UI bajo un formato estricto, prescindiendo del ruido interno de deliberación.
*   **Restricción:** No pide inputs. Solo presenta los resultados empaquetados y prepara el terreno para la apertura de mercado y el agente Axe.

## 4. Output Final de Wags UX (Formato Requerido)

El usuario verá en la pantalla la siguiente síntesis estructurada por Wags tan pronto como apriete "Generar Plan de Vuelo":

---
**JIM: Diagnóstico de Mercado (MGI Snapshot)**
*   Sesgo del Día: [Alcista/Bajista/Neutral]
*   Estado de la Subasta: [Balance/Imbalance/Liquidación/Cobertura]
*   Calidad del Perfil: [Puntaje 1-10]

**Hipótesis Operativas**
*   **Escenario A:** "Si el precio [Acción en Nivel Exacto] con [Respuesta/V], entonces objetivo es [Nivel Exacto]."
*   **Escenario B:** "Si falla en [Nivel Exacto], probabilidad rota hacia [Nivel Exacto]."
*   **Apertura:** "Apertura en [Tipo]. Observar reacción en [Nivel]."

**Invalidez y Niveles**
*   **Hard Stop Lógico:** Tesis inválida si cierra vela de [Temp] superior a [Nivel].
*   **Entrada Sugerida:** [Nivel] | **Target:** [Nivel] | **Confianza:** [1-10]

**TAYLOR: Riesgo y Tamaño**
*   DME (Drawdown Max): [$USD]
*   Puntos de Stop Setup / Sistemático: [X pts]
*   **Tamaño Aprobado:** [X Contratos MNQ]

**WENDY: Evaluación Psicológica**
*   [Análisis cualitativo con mensaje de impacto positivo]

**WAGS:**
*   _"Aquí el Plan de vuelo del día. Pasamos a Axe y Jefe para ejecutar al toque de la campana."_
---

## 5. Próximos Cambios Técnicos Necesarios
1.  **Actualizar `types.ts` y Sidebar UI**: Agregar el formulario para los inputs financieros de Taylor (Drawdown Máximo, Margen por Contrato) y el formulario Pre-Trade de Wendy (Energía, Distracciones).
2.  **Modificar `promptBuilder.ts`**: Destruir el prompt genérico antiguo de Plan de Vuelo y reconstruirlo pasando explícitamente los arrays financieros y la estructura DMC-1 para Jim/Taylor.
3.  **Añadir Algoritmos Locales (UI)**: Programar los cálculos matemáticos de Taylor (tamaños y margin limits) en el cliente o directamente en el prompt para asegurar que siempre haya una respuesta exacta.
4.  **Actualizar `systemInstructions.ts`**: Limpiar todos los rastros de Axe evaluando setups en el task `planVuelo`, y enfocar fuertemente a Wags para extraer únicamente el Output Final requerido.
