export interface OpeningContext {
    relacion: 'DENTRO DE VALOR' | 'FUERA DE VALOR (ARRIBA)' | 'FUERA DE VALOR (ABAJO)';
    sesgo: 'BALANCE' | 'TENDENCIA';
    gap: 'ALCISTA' | 'BAJISTA' | 'NONE';
    tipo: 'OPEN-DRIVE' | 'TEST-DRIVE' | 'OPEN AUCTION IN RANGE' | 'OPEN AUCTION OUT OF RANGE';
    precioApertura: number;
    precioActual: number;
}

/**
 * Función PURA para calcular el contexto de apertura Dalton.
 * No realiza llamadas HTTP.
 */
export function calculateOpeningContext(preMarket: any, precioApertura: number, precioActual: number): OpeningContext {
    if (!preMarket || !preMarket.MGI_RTH) {
        return {
            relacion: 'DENTRO DE VALOR',
            sesgo: 'BALANCE',
            gap: 'NONE',
            tipo: 'OPEN AUCTION IN RANGE',
            precioApertura,
            precioActual
        };
    }

    const { Y_VAH, Y_VAL, Y_MAX, Y_MIN } = preMarket.MGI_RTH;

    // 1. Determinar Relación de Apertura
    let relacion: OpeningContext['relacion'] = 'DENTRO DE VALOR';
    if (precioApertura > Y_VAH) relacion = 'FUERA DE VALOR (ARRIBA)';
    else if (precioApertura < Y_VAL) relacion = 'FUERA DE VALOR (ABAJO)';

    // Sesgo base por apertura
    let sesgo: OpeningContext['sesgo'] = relacion === 'DENTRO DE VALOR' ? 'BALANCE' : 'TENDENCIA';

    // OVERRIDE: Si abrió en Balance (dentro), pero el precio ACTUAL ya rompió con fuerza el área de valor 
    // asumiremos que se ha convertido en un día de Tendencia (Late Breakout).
    if (relacion === 'DENTRO DE VALOR') {
        if (precioActual > Y_VAH || precioActual < Y_VAL) {
            sesgo = 'TENDENCIA';
        }
    }

    // 2. Detectar Gap
    let gap: OpeningContext['gap'] = 'NONE';
    if (precioApertura > Y_MAX) gap = 'ALCISTA';
    else if (precioApertura < Y_MIN) gap = 'BAJISTA';

    // 3. Clasificar Tipo (Lógica simplificada)
    let tipo: OpeningContext['tipo'] = 'OPEN AUCTION IN RANGE';

    const volumenT1 = preMarket.MGI_MACRO?.VOLUMEN_T1 || 0;
    const volumenSMA = preMarket.MGI_MACRO?.VOLUMEN_20DAY_SMA || 0;
    const esVolumenAlto = volumenT1 > volumenSMA * 1.1;

    if (relacion !== 'DENTRO DE VALOR') {
        if (esVolumenAlto && Math.abs(precioActual - precioApertura) > 20) {
            tipo = 'OPEN-DRIVE';
        } else if (relacion === 'FUERA DE VALOR (ARRIBA)' && precioActual < precioApertura) {
            tipo = 'TEST-DRIVE';
        } else if (relacion === 'FUERA DE VALOR (ABAJO)' && precioActual > precioApertura) {
            tipo = 'TEST-DRIVE';
        } else {
            tipo = 'OPEN AUCTION OUT OF RANGE';
        }
    } else {
        tipo = 'OPEN AUCTION IN RANGE';
    }

    return {
        relacion,
        sesgo,
        gap,
        tipo,
        precioApertura,
        precioActual
    };
}
