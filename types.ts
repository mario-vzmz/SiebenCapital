export interface MGIData {
    timestamp?: string;
    PRICE?: {
        candle: { open: number; high: number; low: number; close: number; };
        VWAP_ETH: number;
        VWAP_RTH: number;
        VWAP_RTH_1SD_UP: number;
        VWAP_RTH_1SD_DN: number;
        VWAP_RTH_2SD_UP: number;
        VWAP_RTH_2SD_DN: number;
        VOLUME?: any;
    };
    MGI_RTH?: {
        Y_MAX: number;
        Y_MIN: number;
        ONH: number;
        ONL: number;
        Y_VAH: number;
        Y_POC: number;
        Y_VAL: number;
        EXCESS_UPPER_PCT?: number;
        EXCESS_UPPER_TYPE?: string;
        EXCESS_LOWER_PCT?: number;
        EXCESS_LOWER_TYPE?: string;
    };
    MGI_IB?: {
        IB_HIGH: number;
        IB_LOW: number;
        IB_MID: number;
    };
    MGI_MACRO?: {
        VIX: number;
        ATR_15MIN: number;
        ATR_3DAY_SMA: number;
        VOLUMEN_T1: number;
        VOLUMEN_T2: number;
        VOLUMEN_20DAY_SMA: number;
        SHAPE_SEMANA_ANTERIOR: string;
        SHAPE_DIA_ANTERIOR: string;
    };
    MGI_NODES?: {
        POCs_5D: number[];
        HVNs_3D: number[];
        LVNs_3D: number[];
    };
}

export interface Deliberation {
    id: string;
    timestamp: number;
    input: string;
    output: string;
    status: string;
    type?: string;
    isError?: boolean;
}

export interface UserInputs {
    account_balance: number;
    risk_percent_per_trade: number; // Keep for legacy flows, but Taylor uses DME
    drawdown_max_percent: number;
    margin_per_contract: number;
    marketData: MGIData;
    mentalCheck: string;
    energy_level: 'Bajo' | 'Medio' | 'Alto';
    distractions: string;
}

export interface TradeInput {
    setup_name: string;
    direction: 'LONG' | 'SHORT';
    contracts: number;
    entry_price: number;
    stop_loss: number;
    tp1_price: number;
    tp2_price?: number;
}

export interface TradeLogInput {
    trade_id: string;
    puntos: number;
    final_r?: number;
    tipo_dia?: string;
    outcome: 'WINNER' | 'LOSSER' | 'BREAK_EVEN' | 'VETOED';
    user_notes?: string;
}
export interface ActiveSetup {
    id: number;
    timestamp: string;
    setup_name: string;
    direction: 'LONG' | 'SHORT';
    zone_price: number;
    zone_buffer: number;
    trigger_condition: string;
    entry_limit: number;
    stop_loss: number;
    take_profit: number;
    invalidation_price: number;
    expiry_time: string;
    status: 'WAITING' | 'TRIGGERED' | 'EXPIRED' | 'CANCELLED' | 'NONE';
}
