import { SYSTEM_INSTRUCTIONS, SystemInstructions } from '../systemInstructions';
import { apiUrl } from './api';
import { UserInputs } from '../../types';
import { getLatestVWAPPrice, getPreMarketData, getVWAPRange } from '../services/marketDataService';
import { calculateOpeningContext } from './openingAnalysis';
/**
 * Builds the system instruction prompt based on the task ID.
 * It retrieves the list of agent keys from SYSTEM_INSTRUCTIONS.tasks[taskId]
    * and concatenates their instruction text.
 */
export const getSystemInstructionForTask = (taskId: keyof SystemInstructions['tasks']): string => {
    const agentKeys = SYSTEM_INSTRUCTIONS.tasks[taskId];
    const agentInstructions = agentKeys.map(key => {
        // @ts-ignore - Dynamic access to agent keys is safe here as per contract
        return SYSTEM_INSTRUCTIONS[key] || '';
    }).join('\n\n');

    // For phased tasks, prepend a hard activation override that names only
    // the permitted agents, explicitly silencing everyone else.
    // This overrides CORE_INSTRUCTION's blanket "Sesión de Comité" directive.
    if (taskId.includes('phase')) {
        // Derive human-readable agent names from the key list (skip 'core')
        const nameMap: Record<string, string> = {
            jim: 'Jim', axe: 'Axe', taylor: 'Taylor', wendy: 'Wendy', wags: 'Wags'
        };
        const activeNames = agentKeys
            .filter(k => k !== 'core')
            .map(k => nameMap[k.split('_')[0]] || k)
            .filter(Boolean);
        const silentNames = ['Jim','Axe','Taylor','Wendy','Wags']
            .filter(n => !activeNames.includes(n));

        const gate = `⚠️ ACTIVACIÓN ESTRICTA DE FASE (ANULA PROTOCOLO CORE):
En esta fase ÚNICAMENTE los siguientes agentes tienen autorización para producir output: ${activeNames.join(', ')}.
Los siguientes agentes están en SILENCIO TOTAL y NO deben escribir ni una línea: ${silentNames.join(', ')}.
Esta regla anula el Protocolo de Sesión de Comité. No hagas excepciones.

`;
        return gate + agentInstructions;
    }

    return agentInstructions;
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

    // Extraer la fecha (YYYY-MM-DD) directamente del timestamp del webhook para evitar desfases de Timezone del navegador
    let dateStr = "";
    if (marketData && marketData.timestamp) {
        // marketData.timestamp viene de relay.py (ej. "2026-03-09T07:55:01.093210")
        dateStr = marketData.timestamp.split('T')[0];
    } else {
        const baseDate = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;
    }

    const startIso = `${dateStr}T07:00:00`;
    const endIso = `${dateStr}T08:29:59`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const formattedMarketData = formatNumbers(marketData);

    const vwapLog = rawVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.PRICE.candle);
        const vol = formatNumbers(v.parsed_data.PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const latestVwapObj = rawVwaps.length > 0 ? rawVwaps[rawVwaps.length - 1] : null;
    const firstVwapObj = rawVwaps.length > 0 ? rawVwaps[0] : null;

    // We use the latest close to represent current price at 08:29.
    const price = formattedMarketData.PRICE?.candle?.close || 0;
    const openPrice = firstVwapObj?.parsed_data?.PRICE?.candle?.open || price;

    const daltonContext = calculateOpeningContext(formattedMarketData, openPrice, price);

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
    - Precio Actual [.PRICE.candle.close]: ${price}
    - Condición Mayor (Macro Shape): ${formattedMarketData.MGI_MACRO?.SHAPE_SEMANA_ANTERIOR || 'N/A'}
    - VIX: ${formattedMarketData.MGI_MACRO?.VIX || 'N/A'} | ATR 3D: ${formattedMarketData.MGI_MACRO?.ATR_3DAY_SMA || 'N/A'} | ATR 15M: ${formattedMarketData.MGI_MACRO?.ATR_15MIN || 'N/A'}
    - Forma RTH Anterior: ${formattedMarketData.MGI_MACRO?.SHAPE_DIA_ANTERIOR || 'N/A'}
    - Niveles RTH Prev: MAX ${formattedMarketData.MGI_RTH?.Y_MAX || 'N/A'} | MIN ${formattedMarketData.MGI_RTH?.Y_MIN || 'N/A'} | VAH ${formattedMarketData.MGI_RTH?.Y_VAH || 'N/A'} | VAL ${formattedMarketData.MGI_RTH?.Y_VAL || 'N/A'} | POC ${formattedMarketData.MGI_RTH?.Y_POC || 'N/A'} 
    - Volumen RTH: ${formattedMarketData.MGI_MACRO?.VOLUMEN_T1 || 'N/A'} vs ${formattedMarketData.MGI_MACRO?.VOLUMEN_T2 || 'N/A'}
    - Overnight: ONH ${formattedMarketData.MGI_RTH?.ONH || 'N/A'} | ONL ${formattedMarketData.MGI_RTH?.ONL || 'N/A'}
    - Initial Balance (IB): HIGH ${formattedMarketData.MGI_IB?.IB_HIGH || 'N/A'} | LOW ${formattedMarketData.MGI_IB?.IB_LOW || 'N/A'} | MID ${formattedMarketData.MGI_IB?.IB_MID || 'N/A'} | REGIME: ${formattedMarketData.MGI_IB?.IB_REGIME || 'N/A'}
    - Exceso superior: ${formattedMarketData.MGI_RTH?.EXCESS_UPPER_PCT || '0'}% → ${formattedMarketData.MGI_RTH?.EXCESS_UPPER_TYPE || 'N/A'}
    - Exceso inferior: ${formattedMarketData.MGI_RTH?.EXCESS_LOWER_PCT || '0'}% → ${formattedMarketData.MGI_RTH?.EXCESS_LOWER_TYPE || 'N/A'}
    - Nodos 5D: POCs [${formattedMarketData.MGI_NODES?.POCs_5D?.join(', ') || ''}] | HVNs [${formattedMarketData.MGI_NODES?.HVNs_3D?.join(', ') || ''}] | LVNs [${formattedMarketData.MGI_NODES?.LVNs_3D?.join(', ') || ''}]

    III. PERFIL PSICOLÓGICO (WENDY)
    - Estado Emocional: "${mentalCheck}"
    - Nivel de Energía: ${energy_level}
    - Distracciones Externas: ${distractions}

    IV. AUDITORIA DALTON PRELIMINAR (SISTEMA)
    - Condición Proyectada: ${daltonContext.sesgo} (Basado en relación de apertura vs Área de Valor)
    - Relación Matemática: ${daltonContext.relacion}
    - Exigencia Operativa: Si la condición es BALANCE, Jim debe buscar escenarios FADE (Reversión). Si es TENDENCIA, buscar continuaciones directas.
    
    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Hora Local del Sistema: ${new Date().toLocaleTimeString('es-MX')}
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para el PRE-MARKET.
    Ejecuten en cascada: Jim -> Taylor -> Wendy -> Wags.
    Axe NO participa en esta fase.
    `;
};

export const buildAperturaPrompt = async (inputs: { marketData: any, balance: number, drawdownMax: number, marginPerContract: number }): Promise<string> => {
    // Extraer la fecha (YYYY-MM-DD) del timestamp para evitar desfases de Timezone del navegador
    let dateStr = "";
    if (inputs.marketData && inputs.marketData.timestamp) {
        dateStr = inputs.marketData.timestamp.split('T')[0];
    } else {
        const baseDate = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;
    }

    const startIso = `${dateStr}T07:30:00`;
    const endIso = `${dateStr}T07:55:00`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const mgi = formatNumbers(inputs.marketData || await getPreMarketData());

    // Construir el string del array de velas
    const vwapLog = rawVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.PRICE.candle);
        const vol = formatNumbers(v.parsed_data.PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | Delta: ${vol.DELTA || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const latestVwapObj = rawVwaps.length > 0 ? rawVwaps[rawVwaps.length - 1] : null;
    const firstVwapObj = rawVwaps.length > 0 ? rawVwaps[0] : null;

    const currentPrice = latestVwapObj?.parsed_data?.PRICE?.candle?.close || mgi.PRICE?.candle?.close || 0;
    const openPrice = firstVwapObj?.parsed_data?.PRICE?.candle?.open || currentPrice;

    const daltonContext = calculateOpeningContext(mgi, openPrice, currentPrice);

    let activeLessonsText = '';
    try {
        const ib = mgi.MGI_IB || {};
        const regime = ib.IB_REGIME || 'AMBIGUOUS';
        const confidence = ib.IB_CONFIDENCE || 'LOW';
        const direction = ib.IB_DIRECTION || 'NEUTRAL';
        
        const res = await fetch(apiUrl(`/api/regime_context?regime=${regime}&confidence=${confidence}&direction=${direction}`));
        if (res.ok) {
            const context = await res.json();
            if (context.lessons_count > 0) {
                activeLessonsText = `\n\n    [!!! 🔥 MEMORIA RÉGIMEN (CONTEXTO HISTÓRICO) !!!]\n    En situaciones pasadas de régimen ${regime} (${confidence}/${direction}), el sistema aprendió:\n    ${context.summary}\n    -> Jim, usa esta memoria para ajustar tu sesgo y nivel de exposición.`;
            }
        }
    } catch (e) { console.error("Error fetching regime context", e); }

    return `
    ANÁLISIS DE APERTURA (OPENING ANALYSIS)
    ---------------------------------------${activeLessonsText}
    
    1. DATOS FINANCIEROS (TAYLOR):
    - Saldo de Cuenta: $${inputs.balance} USD
    - Drawdown Max: ${inputs.drawdownMax}%
    - Margen por Contrato: $${inputs.marginPerContract} USD

    2. VECTOR OHLC DE APERTURA (07:30 - 07:55):
    ${vwapLog || 'Sin datos de VWAP para la apertura hoy. Asume simulación o falta de datos.'}

    3. ⚡ PRECIO ACTUAL DE MERCADO (NO ES UN NIVEL INSTITUCIONAL — SOLO PRECIO VIVO):
    PRECIO_ACTUAL = ${currentPrice}
    ⚠️ PROHIBIDO usar PRECIO_ACTUAL como soporte, resistencia o zona de caza. Es puramente el precio de cotización en este instante.

    4. 📐 NIVELES INSTITUCIONALES VWAP (FUENTE: MGI JSONL — USAR ESTOS PARA SETUPS):
    VWAP_RTH          = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH ?? mgi.PRICE?.VWAP_RTH ?? 'N/A'}
    VWAP_RTH_1SD_UP   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_1SD_UP ?? mgi.PRICE?.VWAP_RTH_1SD_UP ?? 'N/A'}
    VWAP_RTH_1SD_DN   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_1SD_DN ?? mgi.PRICE?.VWAP_RTH_1SD_DN ?? 'N/A'}
    VWAP_RTH_2SD_UP   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_2SD_UP ?? mgi.PRICE?.VWAP_RTH_2SD_UP ?? 'N/A'}
    VWAP_RTH_2SD_DN   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_2SD_DN ?? mgi.PRICE?.VWAP_RTH_2SD_DN ?? 'N/A'}
    VWAP_ETH          = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_ETH ?? mgi.PRICE?.VWAP_ETH ?? 'N/A'}
    ✅ Estos son los únicos niveles VWAP válidos para setups. Citar SIEMPRE con su valor exacto (ej: "VWAP_RTH (24613)").

    5. DATOS MGI DE SOPORTE:
    - Rango de ayer: Y_MIN [${mgi.MGI_RTH?.Y_MIN}] - Y_MAX [${mgi.MGI_RTH?.Y_MAX}]
    - Valor de ayer (VA): Y_VAL [${mgi.MGI_RTH?.Y_VAL}] - Y_VAH [${mgi.MGI_RTH?.Y_VAH}]
    - Initial Balance (IB): HIGH ${mgi.MGI_IB?.IB_HIGH} | LOW ${mgi.MGI_IB?.IB_LOW} | MID ${mgi.MGI_IB?.IB_MID} | REGIME: ${mgi.MGI_IB?.IB_REGIME} | DIR: ${mgi.MGI_IB?.IB_DIRECTION}
    - IB Stats: Range: ${mgi.MGI_IB?.IB_RANGE} | Speed: ${mgi.MGI_IB?.IB_CONSTRUCTION_SPEED} | Gravity: ${mgi.MGI_IB?.IB_GRAVITY_DISP} | Asymmetry: ${mgi.MGI_IB?.IB_ASYMMETRY_RATIO}
    - Exceso superior: ${mgi.MGI_RTH?.EXCESS_UPPER_PCT || '0'}% → ${mgi.MGI_RTH?.EXCESS_UPPER_TYPE || 'N/A'}
    - Exceso inferior: ${mgi.MGI_RTH?.EXCESS_LOWER_PCT || '0'}% → ${mgi.MGI_RTH?.EXCESS_LOWER_TYPE || 'N/A'}
    - Nodos 5D Previos: POCs [${mgi.MGI_NODES?.POCs_5D?.join(', ') || ''}]
    - Contexto ON: ONH ${mgi.MGI_RTH?.ONH} | ONL ${mgi.MGI_RTH?.ONL}

    6. AUDITORIA DE CONTEXTO DALTON (SISTEMA):
    - SESGO DEL DÍA: ${daltonContext.sesgo}
    - Relación con el Valor Previo: ${daltonContext.relacion}
    - Situación de Gap: ${daltonContext.gap}
    - Clasificación Inicial: ${daltonContext.tipo}
    Nota para Jim: Esta auditoría es la verdad matemática del sistema. Basa tu diagnóstico en ella. Si es Día de BALANCE (dentro de valor), solo admite operaciones faders (reversión). Si es TENDENCIA, opera a favor del flujo.

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Hora Local del Sistema: ${new Date().toLocaleTimeString('es-MX')}
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para la APERTURA.
    Ejecuten en cascada: Jim -> Axe -> Taylor -> Wendy -> Wags.
    `;
};



export const buildUpdatePrompt = async (inputs: { marketData: any, balance: number, drawdownMax: number, marginPerContract: number }): Promise<string> => {
    // Extraer la fecha del timestamp para coincidir con el servidor de la DB
    let dateStr = "";
    let timeStr = "";
    let baseDate = new Date(); // Fallback para horas/minutos si no hay timestamp

    if (inputs.marketData && inputs.marketData.timestamp) {
        const parts = inputs.marketData.timestamp.split('T');
        dateStr = parts[0];
        timeStr = parts[1].substring(0, 8); // Extrae HH:MM:SS ignorando milisegundos
        // Parse manual seguro para las alertas horarias
        const timeParts = timeStr.split(':');
        baseDate.setHours(parseInt(timeParts[0], 10));
        baseDate.setMinutes(parseInt(timeParts[1], 10));
    } else {
        const pad = (n: number) => n.toString().padStart(2, '0');
        dateStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`;
        timeStr = `${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}:${pad(baseDate.getSeconds())}`;
    }

    const startIso = `${dateStr}T07:30:00`;
    const endIso = `${dateStr}T${timeStr}`;

    const rawVwaps = await getVWAPRange(startIso, endIso);
    const mgi = formatNumbers(inputs.marketData || await getPreMarketData());

    // Construir el string del array de velas, recortando solo a las últimas 30 (mitigando 'Lost in the middle')
    const recentVwaps = rawVwaps.slice(-30);
    const vwapLog = recentVwaps.map(v => {
        const c = formatNumbers(v.parsed_data.PRICE.candle);
        const vol = formatNumbers(v.parsed_data.PRICE.VOLUME || {});
        return `[${v.timestamp.split('T')[1].substring(0, 5)}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} | Vol: ${vol.TOTAL_VOLUME || 0} | Delta: ${vol.DELTA || 0} | CVD: ${vol.CVD || 0}`;
    }).join('\n    ');

    const latestVwapObj = rawVwaps.length > 0 ? rawVwaps[rawVwaps.length - 1] : null;
    const firstVwapObj = rawVwaps.length > 0 ? rawVwaps[0] : null;

    const currentPrice = latestVwapObj?.parsed_data?.PRICE?.candle?.close || mgi.PRICE?.candle?.close || 'N/A';
    const openPrice = firstVwapObj?.parsed_data?.PRICE?.candle?.open || (typeof currentPrice === 'number' ? currentPrice : 0);

    const daltonContext = calculateOpeningContext(mgi, typeof openPrice === 'number' ? openPrice : 0, typeof currentPrice === 'number' ? currentPrice : 0);

    // ---- INYECCIÓN DE CONTEXTO HORARIO LOCAL (TIME AWARENESS) ----
    const localHour = baseDate.getHours();
    const localMinute = baseDate.getMinutes();
    let timeContextAlert = '';

    // Asumiendo que el usuario opera en zona CST (Mexico) donde las 08:30 NY son las 07:30 CST
    if (baseDate.getHours() === 7 && baseDate.getMinutes() >= 30 && baseDate.getMinutes() <= 40) {
        timeContextAlert = `\n    [!!! ALERTA DE SISTEMA: APERTURA MACRO PRE-MERCADO (07:30 CST) !!!]\n    > Se acaba de publicar data macroeconómica o iniciar la apertura regular. Volatilidad esperada. Jim, Axe: Prioricen la narrativa de expansión de rango y rechazo/aceptación de VAH/VAL inmediatos.`;
    } else if ((localHour === 8 || localHour === 9) && localMinute >= 30 && localMinute <= 35) {
        timeContextAlert = `\n    [!!! ALERTA DE SISTEMA: CAMPANA DE APERTURA RTH (09:30 EST) !!!]\n    > Oficialmente el mercado está abierto. Flujo institucional activo y descubrimiento de precio agresivo. Jim, Axe: Lean la primera vela como la intención primaria del día.`;
    }
    // --------------------------------------------------------------

    let activeLessonsText = '';
    try {
        const ib = mgi.MGI_IB || {};
        const regime = ib.IB_REGIME || 'AMBIGUOUS';
        const confidence = ib.IB_CONFIDENCE || 'LOW';
        const direction = ib.IB_DIRECTION || 'NEUTRAL';
        
        const res = await fetch(apiUrl(`/api/regime_context?regime=${regime}&confidence=${confidence}&direction=${direction}`));
        if (res.ok) {
            const context = await res.json();
            if (context.lessons_count > 0) {
                activeLessonsText = `\n\n    [!!! 🔥 MEMORIA RÉGIMEN (CONTEXTO HISTÓRICO) !!!]\n    En situaciones pasadas de régimen ${regime} (${confidence}/${direction}), el sistema aprendió:\n    ${context.summary}\n    -> Jim, usa esta memoria para ajustar tu sesgo y nivel de exposición.`;
            }
        }
    } catch (e) { console.error("Error fetching regime context", e); }

    return `
    ACTUALIZACIÓN ESTRUCTURAL (MARKET UPDATE)
    ----------------------------------------${timeContextAlert}${activeLessonsText}
    
    1. DATOS FINANCIEROS (TAYLOR):
    - Saldo de Cuenta: $${inputs.balance} USD
    - Drawdown Max: ${inputs.drawdownMax}%
    - Margen por Contrato: $${inputs.marginPerContract} USD

    2. VECTOR OHLC RECIENTE (Últimas 30 velas hasta la Actualidad):
    ${vwapLog || 'Sin datos de VWAP registrados.'}
    
    3. ⚡ PRECIO ACTUAL DE MERCADO (NO ES UN NIVEL INSTITUCIONAL — SOLO PRECIO VIVO):
    PRECIO_ACTUAL = ${currentPrice}
    ⚠️ PROHIBIDO usar PRECIO_ACTUAL como soporte, resistencia o zona de caza. Es puramente el precio de cotización en este instante.

    4. 📐 NIVELES INSTITUCIONALES VWAP (FUENTE: MGI JSONL — USAR ESTOS PARA SETUPS):
    VWAP_RTH          = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH ?? mgi.PRICE?.VWAP_RTH ?? 'N/A'}
    VWAP_RTH_1SD_UP   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_1SD_UP ?? mgi.PRICE?.VWAP_RTH_1SD_UP ?? 'N/A'}
    VWAP_RTH_1SD_DN   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_1SD_DN ?? mgi.PRICE?.VWAP_RTH_1SD_DN ?? 'N/A'}
    VWAP_RTH_2SD_UP   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_2SD_UP ?? mgi.PRICE?.VWAP_RTH_2SD_UP ?? 'N/A'}
    VWAP_RTH_2SD_DN   = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_RTH_2SD_DN ?? mgi.PRICE?.VWAP_RTH_2SD_DN ?? 'N/A'}
    VWAP_ETH          = ${latestVwapObj?.parsed_data?.PRICE?.VWAP_ETH ?? mgi.PRICE?.VWAP_ETH ?? 'N/A'}
    ✅ Estos son los únicos niveles VWAP válidos para setups. Axe DEBE usar estos valores exactos y citarlos con número (ej: "VWAP_RTH (24613)").

    5. DATOS MGI Y VOLATILIDAD PUNTUAL:
    - VIX: ${mgi.MGI_MACRO?.VIX}
    - ATR 15M: ${mgi.MGI_MACRO?.ATR_15MIN}
    - Rango de ayer: Y_MIN [${mgi.MGI_RTH?.Y_MIN}] - Y_MAX [${mgi.MGI_RTH?.Y_MAX}]
    - Valores de Subasta: Y_VAL [${mgi.MGI_RTH?.Y_VAL}] - Y_VAH [${mgi.MGI_RTH?.Y_VAH}]
    - Initial Balance (IB): HIGH ${mgi.MGI_IB?.IB_HIGH} | LOW ${mgi.MGI_IB?.IB_LOW} | MID ${mgi.MGI_IB?.IB_MID} | REGIME: ${mgi.MGI_IB?.IB_REGIME}
    - Nodos 5D Previos: POCs [${mgi.MGI_NODES?.POCs_5D?.join(', ') || ''}]
    - Contexto ON: ONH ${mgi.MGI_RTH?.ONH} | ONL ${mgi.MGI_RTH?.ONL}

    6. AUDITORIA DE CONTEXTO DALTON (SISTEMA):
    - SESGO DEL DÍA ACTUALIZADO: ${daltonContext.sesgo}
    - Relación de Apertura: ${daltonContext.relacion}
    Nota para la Cadena: El sesgo puede haber cambiado a TENDENCIA si el precio rompió el VAH o VAL recientemente. Jim y Axe DEBEN adaptar sus análisis y POIs a este Sesgo estricto.

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Hora Local del Sistema: ${new Date().toLocaleTimeString('es-MX')}
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para la ACTUALIZACIÓN INTRADÍA.
    REGLA DE FORMATO JIM: MÁXIMO 3 BULLETS CORTOS.
    Ejecuten en cascada: Jim -> Axe -> Taylor.
    (Wendy y Wags están fuera de esta fase).
    `;
};

/**
 * Constructs the user prompt for the "Gestión Trade" task.
 */
export const buildGestionPrompt = (inputs: { trade: any, marketData: any, balance: number }): string => {
    const formattedTrade = formatNumbers(inputs.trade);
    const formattedMarketData = formatNumbers(inputs.marketData);
    const formattedBalance = formatNumbers(inputs.balance);

    const price = formattedMarketData.PRICE?.candle?.close || 0;
    const openPrice = formattedMarketData.PRICE?.candle?.open || price;
    const daltonContext = calculateOpeningContext(formattedMarketData, openPrice, price);

    const tp2String = formattedTrade.tp2_price ? `\n    - Take Profit 2 (Runner): ${formattedTrade.tp2_price}` : '';

    return `
    GESTIÓN DE TRADE ACTIVO (RISK & EXECUTION)
    ------------------------------------------
    1. DATOS DEL TRADE (¡¡ATENCIÓN A LA DIRECCIÓN Y TAMAÑO!!):
    - Setup: ${formattedTrade.setup_name}
    - Dirección Estricta: ${formattedTrade.direction === 'LONG' ? 'LARGO (COMPRA)' : 'CORTO (VENTA)'}
    - Contratos Activos: ${formattedTrade.contracts} MNQ
    - Entrada Estricta: ${formattedTrade.entry_price}
    - Stop Loss: ${formattedTrade.stop_loss}
    - Take Profit Base (TP1): ${formattedTrade.tp1_price}${tp2String}

    2. DATOS DE MERCADO:
    ${JSON.stringify(formattedMarketData, null, 2)}
    - SESGO DALTON ACTUAL: ${daltonContext.sesgo} (Jim: Si es Trend, dale espacio. Si es Balance, ajusta stops).

    3. TREASURY: Balance=$${formattedBalance} USD

    INSTRUCCIÓN DE EJECUCIÓN (THE CHAIN):
    Hora Local del Sistema: ${new Date().toLocaleTimeString('es-MX')}
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
    - Variación en Puntos: ${log.puntos} pts${rMetrics}
    - Contexto de la Sesión: ${log.tipo_dia || 'Sin registrar'}
    
    2. NOTAS DE SESIÓN (TRADER'S INSIGHTS):
    - ${log.user_notes || "Sin notas adicionales."}

    INSTRUCCIÓN DE EJECUCIÓN:
    Wendy, evalúa el desempeño de este trade analizando el R y los puntos ganados o perdidos. DEBES entregar tu feedback en UN MÁXIMO ABSOLUTO de 140 CARACTERES. Sé cortante, evalúa si respetó plan o hubo fomo.
    Wags, confirma y archiva.
    `;
};

/**
 * Constructs the user prompt for the "Cierre Día" task.
 */
export const buildCierreDiaPrompt = (stats: { 
    balance: number, 
    tradeCount: number, 
    pnl: number, 
    contracts: number, 
    points: number, 
    tradesList: string, 
    comments: string,
    regimeActual: string,
    nivelExposicion: number,
    axeSetupsCount: number
}): string => {
    return `
    CIERRE DE SESIÓN (END OF DAY)
    -----------------------------
    [AUDITORÍA DEL SISTEMA HOY]
    - Régimen de Hoy: ${stats.regimeActual}
    - Nivel de Exposición Aplicado: ${stats.nivelExposicion}
    - Setups Propuestos por Axe: ${stats.axeSetupsCount}
    - Trades Ejecutados: ${stats.tradeCount}
    - Resultado P&L: $${stats.pnl} USD
    
    1. ESTADÍSTICAS FINALES DEL SISTEMA (DATA SQLITE - RESULTADOS REALES):
    - Balance Final: $${stats.balance} USD
    - P&L Real del Día: $${stats.pnl} USD
    - Total de Puntos (R): ${stats.points.toFixed(2)} pts
    - Contratos Operados: ${stats.contracts} 
    - Trades Ejecutados: ${stats.tradeCount}

    2. DETALLE DE OPERACIONES (TRADE LOG):
    ${stats.tradesList}

    3. HISTORIAL DE ACCIONES Y CHARLA (OBSERVACIÓN CLÍNICA WENDY):
    ${stats.comments}

    INSTRUCCIÓN CRÍTICA DE EJECUCIÓN (THE CHAIN):
    Sigan ESTRICTAMENTE sus SYSTEM INSTRUCTIONS cargados en memoria para el CIERRE DE SESIÓN (SHUTDOWN).
    REGLA INQUEBRANTABLE: DEBEN TRATAR TODOS LOS TRADES Y EL P&L COMO DINERO Y EJECUCIONES 100% REALES. BAJO NINGUNA CIRCUNSTANCIA UTILICEN LAS PALABRAS "SIMULACIÓN", "PRUEBAS", "HIPOTÉTICO" NI ASUMAN QUE FUE PAPER TRADING, INDEPENDIENTEMENTE DE LO QUE DIGA EL HISTORIAL DE CHAT. El resultado del día es REAL.
    Ejecuten en cascada: Wendy -> Wags.
    `;
};

export const buildChatPrompt = (query: string, marketData: any, balance: number, activeTrade?: any): string => {
    const formattedMarketData = formatNumbers(marketData);
    const formattedBalance = formatNumbers(balance);

    let tradeContext = "";
    if (activeTrade) {
        const tp2StringChat = activeTrade.tp2_price ? `\n      * Take Profit 2 (Runner): ${activeTrade.tp2_price}` : '';
        tradeContext = `
    - 🚨 TRADE EN CURSO (¡PRIORIDAD ABSOLUTA!):
      * Setup: ${activeTrade.setup_name}
      * Dirección: ${activeTrade.direction === 'LONG' ? 'LARGO (COMPRA)' : 'CORTO (VENTA)'}
      * Contratos Activos: ${activeTrade.contracts} MNQ
      * Entrada Límite Promedio: ${activeTrade.entry_price}
      * Riesgo/Stop Loss: ${activeTrade.stop_loss}
      * Take Profit Base: ${activeTrade.tp1_price}${tp2StringChat}
      
    DIRECTIVA CRÍTICA DE CHAT CON TRADE ACTIVO:
    El operador está haciendo una pregunta específica mientras gestiona una posición de riesgo. Esto no es charla casual.
    Deben auditar profundamente el mercado EN RELACIÓN A ESTA POSICIÓN, utilizando todas sus herramientas avanzadas (MGI, Tape, Telemetría, Psicología).
    Respondan de forma táctica y elocuente sobre por qué el trade tiene sentido o corre peligro inminente basándose en la duda del usuario y la data macro/micro.`;
    }

    return `
    INTERACCIÓN OPERADOR -> AGENTES
    -------------------------------
    CONSULTA DEL OPERADOR:
    "${query}"

    CONTEXTO ACTUAL:
    - Mercado: ${formattedMarketData ? JSON.stringify(formattedMarketData) : 'Sin datos'}
    - Treasury: $${formattedBalance} USD${tradeContext}

    INSTRUCCIÓN DE EJECUCIÓN (CIO WAGS - MODO CONVERSACIONAL LIBRE):
    Eres Wags, el Chief Investment Officer (CIO) de Sieben Capital. Estás conversando 1 a 1 con tu operador en la mesa de trading de futuros.
    - PROHIBIDO utilizar el formato de "Estructura de Bloques de Agentes" (Ej. "📋 [Jim] Análisis... ⚡ [Axe] Flujo institucional..."). Esa cascada rígida está inactiva en el Chat Libre.
    - Tu labor: Pídele internamente y de forma silenciosa la opinión a Jim (Contexto), Axe (Microestructura), Taylor (Riesgo) y Wendy (Mental), SINTETIZA todo ese análisis en tu cerebro de CIO, y entrégale al Operador UNA (1) SOLA RESPUESTA.
    - Formato de Respuesta: Natural, directa y sin censura. Máximo 2 párrafos. Sé un colega de operaciones ("Trading Buddy").
    - Lenguaje: Institucional pero coloquial. Si hay un trade en curso, todo tu análisis debe girar violentamente en torno a proteger o maximizar esa posición, contestando su duda puntual de forma directa. No le des un sermón del mercado entero, responde solo lo que preguntó.
    `;
};
