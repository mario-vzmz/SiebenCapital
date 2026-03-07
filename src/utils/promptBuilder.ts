import { SYSTEM_INSTRUCTIONS, SystemInstructions } from '../systemInstructions';
import { UserInputs } from '../../types';
import { getLatestVWAPPrice, getPreMarketData, getVWAPRange } from '../services/marketDataService';
/**
 * Builds the system instruction prompt based on the task ID.
 * It retrieves the list of agent keys from SYSTEM_INSTRUCTIONS.tasks[taskId]
    * and concatenates their instruction text.
 */
export const getSystemInstructionForTask = (taskId: keyof SystemInstructions['tasks']): string => {
    const agentKeys = SYSTEM_INSTRUCTIONS.tasks[taskId];
    return agentKeys.map(key => {
        // @ts-ignore - Dynamic access to agent keys is safe here as per contract
        return SYSTEM_INSTRUCTIONS[key] || '';
    }).join('\n\n');
};

/**
 * Helper to deep format all numbers in an object to a maximum of 2 decimal places.
 */
export const formatNumbers = (obj: any): any => {
    if (typeof obj === 'number') {
        return Math.round(obj * 100) / 100;
    }
    if (Array.isArray(obj)) {
        return obj.map(formatNumbers);
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = formatNumbers(obj[key]);
        }
        return newObj;
    }
    return obj;
};

export const buildPlanVueloPrompt = async (inputs: UserInputs): Promise<string> => {
    const {
        account_balance,
        drawdown_max_percent,
        margin_per_contract,
        marketData,
        mentalCheck,
        energy_level,
        distractions
    } = inputs;

    let baseDate = new Date();
    if (marketData && marketData.timestamp) {
        baseDate = new Date(marketData.timestamp);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;

    const startIso = `${dateStr}T07:00:00`;
    const endIso = `${dateStr}T08:29:59`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const formattedMarketData = formatNumbers(marketData);

    const vwapLog = rawVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.VWAP_PRICE.candle);
        const vol = formatNumbers(v.parsed_data.VWAP_PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const price = formattedMarketData.VWAP_PRICE?.candle?.close || 0;

    return `
    LANZAMIENTO DE PLAN DE VUELO (PRE-MARKET)
    --------------------------------------------------
    I. DATOS FINANCIEROS (TAYLOR)
    - Saldo de Cuenta: $${account_balance} USD
    - Drawdown Máximo Esperado: ${drawdown_max_percent}%
    - Margen Requerido por Contrato: $${margin_per_contract} USD

    II. DATOS DE MERCADO ACTUALES (JIM - MGI)
    1. VECTOR OHLC PRE-MARKET (07:00 - 08:29):
    ${vwapLog || 'Sin datos de VWAP pre-market. (Simulación o falta de datos)'}

    2. FOTOGRAFÍA ESTÁTICA MGI:
    - Precio VWAP Actual [.VWAP_PRICE.candle.close]: ${price}
    - Condición Mayor (Macro Shape): ${formattedMarketData.MGI_MACRO?.SHAPE_SEMANA_ANTERIOR || 'N/A'}
    - VIX: ${formattedMarketData.MGI_MACRO?.VIX || 'N/A'} | ATR 3D: ${formattedMarketData.MGI_MACRO?.ATR_3DAY_SMA || 'N/A'} | ATR 15M: ${formattedMarketData.MGI_MACRO?.ATR_15MIN || 'N/A'}
    - Forma RTH Anterior: ${formattedMarketData.MGI_MACRO?.SHAPE_DIA_ANTERIOR || 'N/A'}
    - Niveles RTH Prev: MAX ${formattedMarketData.MGI_RTH?.Y_MAX || 'N/A'} | MIN ${formattedMarketData.MGI_RTH?.Y_MIN || 'N/A'} | VAH ${formattedMarketData.MGI_RTH?.Y_VAH || 'N/A'} | VAL ${formattedMarketData.MGI_RTH?.Y_VAL || 'N/A'} | POC ${formattedMarketData.MGI_RTH?.Y_POC || 'N/A'} 
    - Volumen RTH: ${formattedMarketData.MGI_MACRO?.VOLUMEN_T1 || 'N/A'} vs ${formattedMarketData.MGI_MACRO?.VOLUMEN_T2 || 'N/A'}
    - Overnight: ONH ${formattedMarketData.MGI_RTH?.ONH || 'N/A'} | ONL ${formattedMarketData.MGI_RTH?.ONL || 'N/A'}
    - Nodos 5D: POCs [${formattedMarketData.MGI_NODES?.POCs_5D?.join(', ') || ''}] | HVNs [${formattedMarketData.MGI_NODES?.HVNs_3D?.join(', ') || ''}] | LVNs [${formattedMarketData.MGI_NODES?.LVNs_3D?.join(', ') || ''}]

    III. PERFIL PSICOLÓGICO (WENDY)
    - Estado Emocional: "${mentalCheck}"
    - Nivel de Energía: ${energy_level}
    - Distracciones Externas: ${distractions}
    
    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para el PRE-MARKET.
    Ejecuten en cascada: Jim -> Taylor -> Wendy -> Wags.
    Axe NO participa en esta fase.
    `;
};

export const buildAperturaPrompt = async (marketData: any): Promise<string> => {
    let baseDate = new Date();
    if (marketData && marketData.timestamp) {
        baseDate = new Date(marketData.timestamp);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;

    const startIso = `${dateStr}T08:30:00`;
    const endIso = `${dateStr}T08:55:00`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const mgi = formatNumbers(marketData || await getPreMarketData());

    // Construir el string del array de velas
    const vwapLog = rawVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.VWAP_PRICE.candle);
        const vol = formatNumbers(v.parsed_data.VWAP_PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | Delta: ${vol.DELTA || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const latestVwapObj = rawVwaps.length > 0 ? rawVwaps[rawVwaps.length - 1] : null;
    const currentPrice = latestVwapObj?.parsed_data?.VWAP_PRICE?.candle?.close || mgi.VWAP_PRICE?.candle?.close || 'N/A';

    return `
    ANÁLISIS DE APERTURA (OPENING ANALYSIS)
    ---------------------------------------
    1. VECTOR OHLC DE APERTURA (08:30 - 08:55):
    ${vwapLog || 'Sin datos de VWAP para la apertura hoy. Asume simulación o falta de datos.'}

    2. DATOS MGI DE SOPORTE:
    - Precio VWAP Actual [.VWAP_PRICE.candle.close]: ${currentPrice}
    - Rango de ayer: Y_MIN [${mgi.MGI_RTH?.Y_MIN}] - Y_MAX [${mgi.MGI_RTH?.Y_MAX}]
    - Valor de ayer (VA): Y_VAL [${mgi.MGI_RTH?.Y_VAL}] - Y_VAH [${mgi.MGI_RTH?.Y_VAH}]
    - Nodos 5D Previos: POCs [${mgi.MGI_NODES?.POCs_5D?.join(', ') || ''}]
    - Contexto ON: ONH ${mgi.MGI_RTH?.ONH} | ONL ${mgi.MGI_RTH?.ONL}

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para el ANÁLISIS DE APERTURA.
    Ejecuten en cascada: Jim -> Axe -> Taylor -> Wendy -> Wags.
    `;
};



export const buildUpdatePrompt = async (marketData: any): Promise<string> => {
    let baseDate = new Date();
    if (marketData && marketData.timestamp) {
        baseDate = new Date(marketData.timestamp);
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;

    const startIso = `${dateStr}T08:30:00`;
    const endIso = `${dateStr}T${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}:${pad(baseDate.getSeconds())}`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const mgi = formatNumbers(marketData || await getPreMarketData());

    // Construir el string del array de velas, recortando solo a las últimas 30 (mitigando 'Lost in the middle')
    const recentVwaps = rawVwaps.slice(-30);
    const vwapLog = recentVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.VWAP_PRICE.candle);
        const vol = formatNumbers(v.parsed_data.VWAP_PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | Delta: ${vol.DELTA || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const latestVwapObj = rawVwaps.length > 0 ? rawVwaps[rawVwaps.length - 1] : null;
    const currentPrice = latestVwapObj?.parsed_data?.VWAP_PRICE?.candle?.close || mgi.VWAP_PRICE?.candle?.close || 'N/A';

    // ---- INYECCIÓN DE CONTEXTO HORARIO LOCAL (TIME AWARENESS) ----
    const localHour = baseDate.getHours();
    const localMinute = baseDate.getMinutes();
    let timeContextAlert = '';

    // Asumiendo que el usuario opera en zona CST (Mexico) donde las 08:30 NY son las 07:30 CST
    // Si el usuario opera en EST directo, las horas serán 8 y 9 correspondientemente.
    // Para hacer esto tolerante a EST/CST evaluaremos la firma del minuto 30.
    // *MODIFICADO TEMPORALMENTE PARA SIMULACIÓN: Activo entre min 20 y 40*
    if ((localHour === 7 || localHour === 8) && localMinute >= 20 && localMinute <= 40) {
        timeContextAlert = `\n    [!!! ALERTA DE SISTEMA: APERTURA MACRO PRE-MERCADO (08:30 EST) !!!]\n    > Se acaba de publicar data macroeconómica. Volatilidad esperada. Jim, Axe: Prioricen la narrativa de expansión de rango y rechazo/aceptación de VAH/VAL inmediatos.`;
    } else if ((localHour === 8 || localHour === 9) && localMinute >= 30 && localMinute <= 35) {
        timeContextAlert = `\n    [!!! ALERTA DE SISTEMA: CAMPANA DE APERTURA RTH (09:30 EST) !!!]\n    > Oficialmente el mercado está abierto. Flujo institucional activo y descubrimiento de precio agresivo. Jim, Axe: Lean la primera vela como la intención primaria del día.`;
    }
    // --------------------------------------------------------------

    return `
    ACTUALIZACIÓN ESTRUCTURAL (MARKET UPDATE)
    ----------------------------------------${timeContextAlert}
    
    1. VECTOR OHLC RECIENTE (Últimos 30 minutos hasta la Actualidad):
    ${vwapLog || 'Sin datos de VWAP registrados.'}
    
    2. DATOS MGI Y VOLATILIDAD PUNTUAL:
    - Precio VWAP Actual [.VWAP_PRICE.candle.close]: ${currentPrice}
    - VIX: ${mgi.MGI_MACRO?.VIX}
    - ATR 15M: ${mgi.MGI_MACRO?.ATR_15MIN}
    - Rango de ayer: Y_MIN [${mgi.MGI_RTH?.Y_MIN}] - Y_MAX [${mgi.MGI_RTH?.Y_MAX}]
    - Valores de Subasta: Y_VAL [${mgi.MGI_RTH?.Y_VAL}] - Y_VAH [${mgi.MGI_RTH?.Y_VAH}]
    - Nodos 5D Previos: POCs [${mgi.MGI_NODES?.POCs_5D?.join(', ') || ''}]
    - Contexto ON: ONH ${mgi.MGI_RTH?.ONH} | ONL ${mgi.MGI_RTH?.ONL}

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para la ACTUALIZACIÓN INTRADÍA.
    Ejecuten en cascada: Jim -> Axe -> Taylor -> Wendy -> Wags.
    `;
};

/**
 * Constructs the user prompt for the "Gestión Trade" task.
 */
export const buildGestionPrompt = (inputs: { trade: any, marketData: any, balance: number }): string => {
    const formattedTrade = formatNumbers(inputs.trade);
    const formattedMarketData = formatNumbers(inputs.marketData);
    const formattedBalance = formatNumbers(inputs.balance);

    return `
    GESTIÓN DE TRADE ACTIVO (RISK & EXECUTION)
    ------------------------------------------
    1. DATOS DEL TRADE (¡¡ATENCIÓN A LA DIRECCIÓN!!):
    - Setup: ${formattedTrade.setup_name}
    - Dirección Estricta: ${formattedTrade.direction === 'LONG' ? 'LARGO (COMPRA)' : 'CORTO (VENTA)'}
    - Entrada Estricta: ${formattedTrade.entry_price}
    - Stop Loss: ${formattedTrade.stop_loss}
    - Take Profit: ${formattedTrade.tp1_price}

    2. DATOS DE MERCADO:
    ${JSON.stringify(formattedMarketData, null, 2)}

    3. TREASURY: Balance=$${formattedBalance} USD

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para la GESTIÓN DE TRADE ACTIVO.
    
    REGLA DE ORO DE COMUNICACIÓN (OBLIGATORIO PARA JIM, AXE, Y TAYLOR):
    1. SIEMPRE mencionen qué dirección están operando (LARGO / CORTO) antes de elaborar matemáticas.
    2. SIEMPRE nombren el nombre estricto del Data Point del cual están deduciendo conclusiones (Ejemplo: "Dado que nuestro stop loss de 25620 está sobre la línea VWAP_RTH_1SD_UP (25600)..." o "Observo que Y_POC está en..."). NO asuman valores sin nombrar la variable exacta del JSON de Mercado.

    Ejecuten en cascada: Jim -> Axe -> Taylor -> Wendy -> Wags.
    `;
};

/**
 * Constructs the user prompt for the "Trade Log" task.
 */
export const buildTradeLogPrompt = (log: any): string => {
    const rMetrics = log.final_r !== undefined ? `\n    - P&L en Riesgo (R): ${log.final_r.toFixed(2)}R` : '';

    return `
    REGISTRO Y AUDITORÍA DE TRADE (POST-TRADE)
    ------------------------------------------
    1. RESULTADOS DE LA OPERACIÓN:
    - ID: ${log.trade_id}
    - Outcome: ${log.outcome}
    - P&L Final: $${log.final_pnl} ${log.pnl_currency}${rMetrics}
    
    2. NOTAS DE SESIÓN (WENDY'S INSIGHTS):
    - ${log.user_notes || "Sin notas adicionales."}

    INSTRUCCIÓN DE EJECUCIÓN:
    Wendy, evalúa el desempeño de este trade. Si el P&L en 'R' está disponible, utilízalo como métrica principal para tu análisis de gestión de riesgo frente a la psicología del trader. Entrega un insight accionable corto para mejorar en la próxima operación. Wags, archiva y entrega el reporte final de trade.
    `;
};

/**
 * Constructs the user prompt for the "Cierre Día" task.
 */
export const buildCierreDiaPrompt = (stats: { balance: number, tradeCount: number }): string => {
    return `
    CIERRE DE SESIÓN (END OF DAY)
    -----------------------------
    1. ESTADÍSTICAS FINALES:
    - Balance Final: $${stats.balance} USD
    - Operaciones Realizadas: ${stats.tradeCount}

    INSTRUCCIÓN DE EJECUCIÓN:
    Wendy, realiza el cierre psicológico. Wags, genera el resumen ejecutivo de la jornada y ordena la desconexión total. Jim, guarda las lecciones estructurales.
    `;
};

/**
 * Constructs the user prompt for a direct chat/interaction.
 */
export const buildChatPrompt = (query: string, marketData: any, balance: number, activeTrade?: any): string => {
    const formattedMarketData = formatNumbers(marketData);
    const formattedBalance = formatNumbers(balance);

    let tradeContext = "";
    if (activeTrade) {
        tradeContext = `
    - TRADE EN CURSO (¡ATENCIÓN A ESTO!):
      * Setup: ${activeTrade.setup_name}
      * Dirección: ${activeTrade.direction === 'LONG' ? 'LARGO (COMPRA)' : 'CORTO (VENTA)'}
      * Entrada Límite Promedio: ${activeTrade.entry_price}
      * Riesgo/Stop Loss: ${activeTrade.stop_loss}
      * Take Profit Base: ${activeTrade.tp1_price}`;
    }

    return `
    INTERACCIÓN OPERADOR -> AGENTES
    -------------------------------
    CONSULTA DEL OPERADOR:
    "${query}"

    CONTEXTO ACTUAL:
    - Mercado: ${formattedMarketData ? JSON.stringify(formattedMarketData) : 'Sin datos'}
    - Treasury: $${formattedBalance} USD${tradeContext}

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Respondan a la consulta del operador desde sus respectivas especialidades. Mantengan el tono profesional y la jerarquía del protocolo.
    Reconozcan y usen el contexto del TRADE EN CURSO si existe para responder de manera accionable.
    `;
};
