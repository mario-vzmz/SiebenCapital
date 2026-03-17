# Especificación de Motores (Engines) - v1.1

### Engine 1: Pre-Plan Contextualizer (Jim)
- **Horario de ejecución:** 
    - Manual: A petición del usuario en cualquier momento pre-apertura.
    - Automático: Disparo forzado a las 08:25 AM si no ha sido ejecutado.
- **Alcance:** Genera el "Plan de Vuelo" estático. No incluye datos de apertura (08:30+).
- **Lógica:** Cruza niveles T-1, MGI Macro y niveles de 5 días para definir zonas de interés y sesgo.

### Engine 2: Aperture Execution (Axe)
- **Horario:** 09:30 - 10:30 AM
- **Función:** Analiza la relación de apertura (Gap vs Inside) y determina el "Confidence Level" del día.
- **Input:** Flujo de datos minuto a minuto del Open.

### Engine 3: Risk Guardian (Taylor)
- **Función:** Control de Drawdown y tamaño de posición basado en volatilidad (ATR).

### Engine 4: Psychological Advisor (Wendy)
- **Función:** Filtro de seguridad emocional. Si el trader reporta "Baja Energía" o "Distracciones", el Engine 3 (Taylor) aplica un multiplicador de reducción de riesgo (0.5x).
