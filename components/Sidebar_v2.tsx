import * as React from 'react';
import {
    Wallet, AlertTriangle, Download, MessageSquare,
    Plus, Activity
} from 'lucide-react';
import { MGIData, Deliberation } from '../types';

interface SidebarV2Props {
    balance: string;
    setBalance: (value: string) => void;
    drawdownMax: string;
    setDrawdownMax: (value: string) => void;
    marginPerContract: string;
    setMarginPerContract: (value: string) => void;
    isProcessing: boolean;
    apiError: string | null;
    onOpenKeyDialog: () => void;
    relayStatus: 'DISCONNECTED' | 'WAITING' | 'CONNECTED';
    marketData: MGIData | null;
    onExportSession: () => void;
    hasData: boolean;
    historyItems: Deliberation[];
    onSelectHistoryItem: (item: Deliberation) => void;
    onNewChat: () => void;
}

// Helper: round any number to 2 decimal places, return '---' if falsy
const fmt2 = (val: any): string => {
    const n = parseFloat(val);
    if (!val || isNaN(n)) return '---';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function SidebarV2({
    balance,
    setBalance,
    drawdownMax,
    setDrawdownMax,
    marginPerContract,
    setMarginPerContract,
    isProcessing,
    apiError,
    onOpenKeyDialog,
    relayStatus,
    marketData,
    onExportSession,
    hasData,
    historyItems,
    onSelectHistoryItem,
    onNewChat,
}: SidebarV2Props) {

    const drawdownVal = parseFloat(drawdownMax) || 3;
    const riskMax = parseFloat(balance) > 0
        ? (parseFloat(balance) * drawdownVal * 0.01).toFixed(2)
        : '0.00';

    // ── TIPO DE DÍA logic ──
    const price  = marketData?.PRICE?.candle?.close ?? 0;
    const yVAH   = marketData?.MGI_RTH?.Y_VAH ?? 0;
    const yVAL   = marketData?.MGI_RTH?.Y_VAL ?? 0;
    const yPOC   = marketData?.MGI_RTH?.Y_POC;
    const atr15  = marketData?.MGI_MACRO?.ATR_15MIN;

    const tipoDia = price === 0
        ? '---'
        : (price > yVAH || price < yVAL) ? 'TENDENCIA' : 'BALANCE';
    const tipoDiaColor = tipoDia === 'TENDENCIA'
        ? 'text-amber-400'
        : tipoDia === 'BALANCE'
        ? 'text-emerald-400'
        : 'text-zinc-500';
    const tipoDiaGlow = tipoDia === 'TENDENCIA'
        ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
        : tipoDia === 'BALANCE'
        ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
        : '';

    return (
        <aside className="w-[280px] bg-[#0a0f1c]/95 backdrop-blur-2xl border-r border-white/5 p-5 flex flex-col flex-shrink-0 overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.5)]">

            {/* ── LOGO ── */}
            <div className="mb-6 flex items-center gap-3 flex-shrink-0">
                <svg
                    className="h-9 w-auto block drop-shadow-[0_0_8px_rgba(56,189,248,0.4)] hover:drop-shadow-[0_0_14px_rgba(56,189,248,0.7)] transition-all duration-300 cursor-pointer flex-shrink-0"
                    viewBox="0 0 70 48" fill="none"
                >
                    <rect x="0"  y="16" width="6" height="32" fill="white" />
                    <rect x="10" y="8"  width="6" height="40" fill="white" />
                    <rect x="20" y="0"  width="6" height="48" fill="white" />
                    <rect x="30" y="8"  width="6" height="40" fill="white" />
                    <rect x="40" y="20" width="6" height="28" fill="white" />
                    <rect x="50" y="32" width="6" height="16" fill="white" />
                    <rect x="60" y="0"  width="6" height="48" fill="white" />
                </svg>
                <div className="flex flex-col leading-tight">
                    <span
                        className="text-[22px] font-black tracking-[-0.02em] bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
                        style={{ fontFamily: "'Oxanium', cursive" }}
                    >
                        SIEBEN
                    </span>
                    <span
                        className="text-[9px] tracking-[0.22em] text-white/40 uppercase font-medium"
                        style={{ fontFamily: "'Oxanium', cursive" }}
                    >
                        CAPITAL
                    </span>
                </div>
            </div>

            {/* ── SCROLLABLE CONTENT (everything except export) ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-0.5 min-h-0">

                {/* ── LIVE DATA STREAM ── */}
                {marketData && (
                    <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-xl p-4 space-y-3 flex-shrink-0">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${relayStatus === 'CONNECTED' ? 'bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]' : 'bg-zinc-600'}`} />
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                    Live Data Stream
                                </span>
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${relayStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                                {relayStatus === 'CONNECTED' ? 'CONNECTED' : relayStatus}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

                        {/* TIPO DE DÍA hero */}
                        <div className="flex items-center gap-2.5">
                            <div className={`w-1 h-7 rounded-full flex-shrink-0 ${tipoDia === 'TENDENCIA' ? 'bg-gradient-to-b from-amber-400 to-amber-600' : tipoDia === 'BALANCE' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-zinc-700'}`} />
                            <div className="flex flex-col">
                                <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Tipo de Día</span>
                                <span
                                    className={`text-[17px] font-black uppercase tracking-tight leading-none ${tipoDiaColor} ${tipoDiaGlow}`}
                                    style={{ fontFamily: "'Oxanium', cursive" }}
                                >
                                    {tipoDia}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                        {/* 2×2 data matrix — all values rounded to 2 decimals */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Y-VAH',   value: fmt2(yVAH),  color: 'text-white' },
                                { label: 'Y-VAL',   value: fmt2(yVAL),  color: 'text-white' },
                                { label: 'Y-POC',   value: fmt2(yPOC),  color: 'text-white' },
                                { label: 'ATR 15M', value: fmt2(atr15), color: 'text-cyan-400' },
                            ].map(({ label, value, color }) => (
                                <div
                                    key={label}
                                    className="bg-black/20 border border-white/[0.03] rounded-lg p-2.5 flex flex-col gap-0.5"
                                >
                                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
                                    <span className={`text-[13px] font-bold font-mono tabular-nums leading-tight ${color} ${label === 'ATR 15M' ? 'drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]' : ''}`}>
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── TESORERÍA (FIJO only) ── */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-xl p-4 space-y-3 flex-shrink-0">

                    {/* Header */}
                    <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-cyan-400 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Tesorería (USD)
                        </span>
                    </div>

                    {/* Account Balance */}
                    <div className="space-y-1">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Account Balance</span>
                        <div className="flex items-center bg-black/20 border border-white/[0.05] rounded-lg px-3 py-2 focus-within:border-cyan-500/50 transition-colors">
                            <span className="text-[11px] text-zinc-500 mr-2 font-mono">$</span>
                            <input
                                type="number"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                className="w-full bg-transparent border-none text-[12px] font-mono text-white outline-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Drawdown Max — slider */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Drawdown Máx</span>
                            <span className="text-[11px] font-bold font-mono text-rose-400">{drawdownVal}%</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={5}
                            step={0.5}
                            value={drawdownVal}
                            onChange={(e) => setDrawdownMax(e.target.value)}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer sidebar-slider"
                            style={{
                                background: `linear-gradient(to right, #f43f5e ${((drawdownVal - 1) / 4) * 100}%, rgba(255,255,255,0.1) ${((drawdownVal - 1) / 4) * 100}%)`
                            }}
                        />
                        <div className="flex justify-between">
                            <span className="text-[8px] text-zinc-600 font-mono">1%</span>
                            <span className="text-[8px] text-zinc-600 font-mono">5%</span>
                        </div>
                    </div>

                    {/* Margen / Contrato */}
                    <div className="space-y-1">
                        <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Margen / Contrato</span>
                        <div className="flex items-center bg-black/20 border border-white/[0.05] rounded-lg px-3 py-2 focus-within:border-cyan-500/50 transition-colors">
                            <span className="text-[11px] text-zinc-500 mr-2 font-mono">$</span>
                            <input
                                type="number"
                                value={marginPerContract}
                                onChange={(e) => setMarginPerContract(e.target.value)}
                                className="w-full bg-transparent border-none text-[12px] font-mono text-white outline-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Risk summary */}
                    <div className="flex justify-between items-center pt-1 border-t border-white/5">
                        <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">Riesgo Máx Sesión</span>
                        <span className="text-[10px] font-bold font-mono text-rose-400">${riskMax}</span>
                    </div>
                </div>

                {/* ── API Error ── */}
                {apiError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex flex-col gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2 text-rose-400">
                            <AlertTriangle size={13} />
                            <span className="text-[9px] font-black uppercase tracking-wider">Critical Fault</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{apiError}</p>
                        <button
                            onClick={onOpenKeyDialog}
                            className="mt-1 w-full bg-rose-500/80 hover:bg-rose-500 py-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-wider transition-colors cursor-pointer"
                        >
                            Change API Key
                        </button>
                    </div>
                )}

                {/* ── SESSION HISTORY — fixed-height panel with internal scroll ── */}
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-xl flex flex-col flex-shrink-0" style={{ height: '200px' }}>

                    {/* History header */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5 flex-shrink-0">
                        <h3
                            className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-zinc-300 transition-colors cursor-pointer"
                            onClick={onNewChat}
                        >
                            <MessageSquare size={11} />
                            Historial de Sesión
                        </h3>
                        <button
                            onClick={onNewChat}
                            className="text-zinc-600 hover:text-cyan-400 transition-colors cursor-pointer"
                            title="Nueva Sesión"
                        >
                            <Plus size={13} />
                        </button>
                    </div>

                    {/* Scrollable history list — fixed, no overflow into sidebar */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 min-h-0">
                        {historyItems.length === 0 ? (
                            <p className="text-[9px] font-mono text-zinc-600 py-2">{'// No history'}</p>
                        ) : (
                            historyItems.map((item, idx) => {
                                const date = new Date(item.timestamp);
                                const title = item.status === 'READY' ? 'Plan de Vuelo' : (item.type || 'Sys Output');
                                const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                                return (
                                    <div
                                        key={item.id || idx}
                                        onClick={() => onSelectHistoryItem(item)}
                                        className="p-2.5 rounded-xl bg-white/4 border border-white/5 cursor-pointer transition-all duration-200 hover:border-cyan-500/30 hover:bg-white/6 group"
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider group-hover:text-cyan-400 transition-colors truncate">{title}</span>
                                            <span className="text-[9px] font-mono text-zinc-600 flex-shrink-0 ml-2">{timeStr}</span>
                                        </div>
                                        <span className="text-[9px] text-zinc-600 line-clamp-1 font-mono">{item.input || '...'}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>{/* end scrollable content */}

            {/* ── EXPORT — always visible at bottom ── */}
            <div className="pt-4 border-t border-white/5 flex-shrink-0 mt-4">
                <button
                    onClick={onExportSession}
                    disabled={!hasData}
                    className="w-full flex items-center justify-center gap-2 bg-white/[0.02] hover:bg-white/5 disabled:opacity-30 border border-white/5 hover:border-white/10 py-2.5 rounded-xl text-[9px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                    <Download size={13} />
                    Export Session .md
                </button>
            </div>

            {/* Slider thumb custom styles */}
            <style>{`
                .sidebar-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #f43f5e;
                    box-shadow: 0 0 8px rgba(244,63,94,0.7);
                    cursor: pointer;
                }
                .sidebar-slider::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border: none;
                    border-radius: 50%;
                    background: #f43f5e;
                    box-shadow: 0 0 8px rgba(244,63,94,0.7);
                    cursor: pointer;
                }
            `}</style>
        </aside>
    );
}
