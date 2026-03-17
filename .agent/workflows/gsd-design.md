---
description: Flujo de trabajo para iniciar el diseño UI/UX (Mockups en Alta Fidelidad)
---
# Flujo de Trabajo: /gsd:design

Este flujo se activa cuando el usuario solicita iniciar la fase de diseño (`/gsd:design`).

## Pasos

1. **Generación de Mockup Visual (Alta Fidelidad):**
   - Utilizar la herramienta nativa `generate_image` para crear un mockup de la interfaz solicitada.
   - **Prontuario Estricto:** Asegurarse de incluir en el prompt "modern UI/UX design, high fidelity, precise gradients, Oxanium typography, professional web application interface" (simulando la calidad "Nano Banana").
   - Guardar el mockup con un nombre descriptivo (ej. `[page]_mockup_v1`).

2. **Consulta al Sistema de Diseño (ui-ux-pro-max):**
   - Utilizar el script de la skill `ui-ux-pro-max` para obtener la paleta de colores, tipografía (Oxanium) y directrices UX correspondientes al mockup generado.
   - Ejecutar: `python3 skills/ui-ux-pro-max/scripts/search.py "modern web gradient oxanium" --design-system`

3. **Presentación de Resultados al Usuario:**
   - Mostrar el mockup generado junto con el sistema de diseño propuesto para que el usuario pueda validar la estética antes de escribir el código de los componentes.
