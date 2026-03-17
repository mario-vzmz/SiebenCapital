import { MGIData } from '../../types';

export interface VWAPPrice {
    timestamp: string;
    parsed_data: {
        PRICE: {
            candle: {
                open: number;
                high: number;
                low: number;
                close: number;
            };
            VOLUME?: {
                DELTA?: number;
                TOTAL_VOLUME?: number;
                CVD?: number;
                [key: string]: any;
            };
            VWAP_ETH: number;
            VWAP_RTH: number;
            VWAP_RTH_1SD_UP: number;
            VWAP_RTH_1SD_DN: number;
            VWAP_RTH_2SD_UP: number;
            VWAP_RTH_2SD_DN: number;
        };
    };
    status: string;
}

export interface MGIPremarket {
    MGI_RTH: {
        Y_MAX: number;
        Y_MIN: number;
        ONH: number;
        ONL: number;
        Y_VAH: number;
        Y_POC: number;
        Y_VAL: number;
    } | null;
    MGI_NODES: {
        POCs_5D: number[];
        HVNs_3D: number[];
        LVNs_3D: number[];
    } | null;
    MGI_MACRO: {
        VIX: number;
        ATR_15MIN: number;
        ATR_3DAY_SMA: number;
        VOLUMEN_T1: number;
        VOLUMEN_T2: number;
        VOLUMEN_20DAY_SMA: number;
        SHAPE_SEMANA_ANTERIOR: string;
        SHAPE_DIA_ANTERIOR: string;
    } | null;
    MGI_IB: {
        IB_HIGH: number;
        IB_LOW: number;
        IB_MID: number;
        IB_OPEN: number;
        IB_RANGE: number;
        IB_RANGE_10M: number;
        IB_RANGE_20M: number | null;
        IB_CONSTRUCTION_SPEED: number;
        IB_PRIOR_POC: number;
        IB_GRAVITY_DISP: number;
        IB_ASYMMETRY_RATIO: number;
        IB_REGIME: string;
        IB_CONFIDENCE: string;
        IB_DIRECTION: string;
    } | null;
}

export async function getLatestVWAPPrice(): Promise<VWAPPrice> {
    const res = await fetch('/api/marketdata/latest-vwap');
    if (!res.ok) {
        throw new Error(`Error fetching latest VWAP: ${res.statusText}`);
    }
    return await res.json() as VWAPPrice;
}

export async function getPreMarketData(): Promise<MGIPremarket> {
    const res = await fetch('/api/marketdata/pre-market');
    if (!res.ok) {
        throw new Error(`Error fetching pre-market data: ${res.statusText}`);
    }
    return await res.json() as MGIPremarket;
}

export async function getVWAPRange(startIso: string, endIso: string): Promise<VWAPPrice[]> {
    const res = await fetch(`/api/marketdata/range?start=${startIso}&end=${endIso}`);
    if (!res.ok) {
        throw new Error(`Error fetching VWAP range: ${res.statusText}`);
    }
    return await res.json() as VWAPPrice[];
}
