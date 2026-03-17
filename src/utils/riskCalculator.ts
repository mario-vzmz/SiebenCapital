import { TradeInput } from '../../types';

export function calculateRiskUnits(pnlUsd: number, balanceUsd: number, riskPercent: number = 1): number {
    const riskAmount = (balanceUsd * riskPercent) / 100;
    if (riskAmount === 0) return 0;
    return pnlUsd / riskAmount;
}
