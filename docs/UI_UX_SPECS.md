# UI/UX Specifications: Treasury Module

## 1. Componente: Sieben Treasury (Collapsible)
- **Activador:** Botón con icono de `Wallet` y texto "Sieben Treasury".
- **Comportamiento:** Al hacer clic, despliega un contenedor con desenfoque de fondo (backdrop-blur) y borde neón.
- **Seguridad Visual:** Los datos de balance y riesgo solo son visibles bajo demanda para proteger la privacidad del trader.

## 2. Controles de Ingesta
- **Account Balance:** 
  - Input numérico manual.
  - Validación: Solo números positivos.
  - Símbolo de moneda ($) prefijado.
- **Daily Drawdown Slider:**
  - Tipo: Range Input.
  - Pasos (Steps): 5 puntos fijos [1, 2, 3, 4, 5].
  - Visualización: Tooltip o etiqueta dinámica mostrando el valor en porcentaje (%).

## 3. Persistencia
- Los valores se guardan en `localStorage` con las llaves `SIEBEN_BALANCE` y `SIEBEN_DRAWDOWN`.
- Al cargar el app, Taylor Mason inicializa su motor con estos valores.
