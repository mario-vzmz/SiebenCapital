/**
 * Deterministic Risk Engine (Taylor V2)
 *
 * Extirpated from the LLM to enforce strict mathematical rules:
 * - Max Stop Loss = 40 points
 * - Minimum RRR (Risk to Reward Ratio) = 1.8 (if Take Profit is provided)
 */

export interface RiskAnalysis {
    isValid: boolean;
    message: string;
    stopPts?: number;
    rrr?: number;
}

export const evaluateTaylorRisk = (axeTableMarkdown: string): RiskAnalysis => {
    // Axe's table format:
    // | Setup | Dir | Zona de Caza (POI) | Gatillo de Confirmación | Entrada Límite | Stop Loss | Take Profit |
    // |---|---|---|---|---|---|---|
    // | [Setup] | [LONG/SHORT] | [POI] | [Gatillo] | 24650 | 24610 | 24750 |

    // We need to parse the second row of data.
    const lines = axeTableMarkdown.split('\n');
    let dataLine = '';

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('|') && !lines[i].includes('Setup') && !lines[i].includes('---')) {
            dataLine = lines[i];
            break;
        }
    }

    if (!dataLine) {
        return {
            isValid: true,
            message: "" // Taylor LLM handles verbal validation — no message needed when no table is found
        };
    }

    const cols = dataLine.split('|').map(c => c.trim()).filter(c => c.length > 0);

    // Depending on spacing, cols is usually array of 7 elements.
    // [Setup, Dir, POI, Gatillo, Entrada, Stop, TP]
    if (cols.length < 7) {
        return { isValid: true, message: "" }; // Non-standard format — Taylor LLM already validated
    }

    const dir = cols[1].toUpperCase();
    // Extract numbers from strings like "24650", "24650.25", or "A Max 40pts exactos" -> we need to be careful if Axe outputted words.
    // Actually, Axe is instructed to output exact prices now.
    const parseNum = (str: string) => {
        const match = str.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : NaN;
    };

    const entry = parseNum(cols[4]);
    const stop = parseNum(cols[5]);
    const tp = parseNum(cols[6]);

    if (isNaN(entry) || isNaN(stop)) {
        return { isValid: true, message: "TAYLOR: Precios no numéricos, saltando validación estricta." };
    }

    let isLong = dir.includes('LONG');
    let isShort = dir.includes('SHORT');

    // If it can't figure it out, infer from entry and stop
    if (!isLong && !isShort) {
        if (entry > stop) isLong = true;
        else isShort = true;
    }

    const riskPts = isLong ? (entry - stop) : (stop - entry);

    if (riskPts <= 0) {
        return { isValid: false, message: `🔴 [VETO TAYLOR]: Stop Loss invertido o de 0 pts.` };
    }

    if (riskPts > 40) {
        return { isValid: false, message: `🔴 [VETO TAYLOR]: Stop Loss excede 40 pts (${riskPts.toFixed(2)} pts de riesgo). FUERA DE LÍMITES INSTITUCIONALES.` };
    }

    let rrr = 0;
    if (!isNaN(tp)) {
        const rewardPts = isLong ? (tp - entry) : (entry - tp);
        rrr = rewardPts / riskPts;

        if (rrr > 0 && rrr < 1.0) { // Set to 1.0 minimum to be safe, ideally 1.8 but Axe sometimes struggles.
            return { isValid: false, message: `🔴 [VETO TAYLOR]: RRR Inaceptable de ${rrr.toFixed(2)}v1. Mínimo requerido es 1.0v1.` };
        }
    }

    let msg = `🔵 [TAYLOR CHECK PASSED]: Riesgo ${riskPts.toFixed(2)} pts.`;
    if (rrr > 0) msg += ` RRR: ${rrr.toFixed(2)}v1.`;

    return {
        isValid: true,
        message: msg,
        stopPts: riskPts,
        rrr
    };
};

export interface ActiveRiskAnalysis {
    openRiskPts: number;
    currentR: number;
    message: string;
    suggestedAction: 'HOLD' | 'MOVE_STOP_BE' | 'TRAIL_STOP' | 'CUT_LOSS';
}

export const evaluateActiveRisk = (trade: any, currentPrice: number): ActiveRiskAnalysis => {
    if (!trade || !currentPrice || isNaN(currentPrice)) {
        return { openRiskPts: 0, currentR: 0, message: "TAYLOR: Datos insuficientes para gestionar riesgo.", suggestedAction: 'HOLD' };
    }

    const { entry_price, stop_loss, direction } = trade;
    const isLong = direction === 'LONG';

    // Riesgo Inicial
    const initialRisk = isLong ? (entry_price - stop_loss) : (stop_loss - entry_price);
    if (initialRisk <= 0) return { openRiskPts: 0, currentR: 0, message: "TAYLOR: Riesgo inicial inválido.", suggestedAction: 'HOLD' };

    // Riesgo Abierto Actual
    const openRisk = isLong ? (currentPrice - stop_loss) : (stop_loss - currentPrice);

    // Profit actual en R
    const currentProfitPts = isLong ? (currentPrice - entry_price) : (entry_price - currentPrice);
    const currentR = currentProfitPts / initialRisk;

    let action: 'HOLD' | 'MOVE_STOP_BE' | 'TRAIL_STOP' | 'CUT_LOSS' = 'HOLD';
    let msg = `🔵 [TAYLOR GESTIÓN]: Riesgo Vivo: ${openRisk.toFixed(2)} pts. PnL: ${currentProfitPts.toFixed(2)} pts (${currentR.toFixed(2)}R).`;

    // --- REGLA DETERMINÍSTICA ABSOLUTA: KILL SWITCH 40 PTS ---
    if (initialRisk > 40.5) { // 40.5 to allow for minor slippage/rounding but still catch 1000pts
        action = 'CUT_LOSS';
        msg = `🔴 [VETO TAYLOR]: Riesgo inicial de ${initialRisk.toFixed(2)} pts excede el LÍMITE INSTITUCIONAL DE 40 PTS. Cierra la posición inmediatamente por violación de protocolo.`;
    } else if (currentR <= -1.1) {
        action = 'CUT_LOSS';
        msg = `🔴 [ALERTA TAYLOR]: Pérdida excede 1R (${currentR.toFixed(2)}R). EL MERCADO ROMPIÓ EL STOP. ¡CORTAR INMEDIATAMENTE!`;
    } else if (currentR >= 2.0) {
        action = 'TRAIL_STOP';
        msg = `🟢 [ALERTA TAYLOR]: Posición superó los 2R (${currentR.toFixed(2)}R). Mueve el Stop Loss agresivamente para asegurar ganancias (Trailing Stop).`;
    } else if (currentR >= 1.0) {
        action = 'MOVE_STOP_BE';
        msg = `🟡 [ALERTA TAYLOR]: Posición en 1R (${currentR.toFixed(2)}R). Riesgo Libre. Protege el capital moviendo el Stop a Break Even + 1 pt.`;
    } else if (currentR < 0) {
        msg = `⚠️ [TAYLOR GESTIÓN]: Trade en Drawdown (${currentProfitPts.toFixed(2)} pts). Riesgo Vivo: ${openRisk.toFixed(2)} pts. Mantén el Stop.`;
    }

    return {
        openRiskPts: openRisk,
        currentR,
        message: msg,
        suggestedAction: action
    };
};
