import * as React from 'react';
import { Wallet, AlertTriangle, Wifi, WifiOff, Activity, Download, MessageSquare, Plus } from 'lucide-react';
import { MGIData, Deliberation } from '../types';

interface SidebarProps {
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

export function Sidebar({
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
    onNewChat
}: SidebarProps) {

    const formattedRisk = parseFloat(balance) > 0 ? (parseFloat(balance) * 0.01).toFixed(2) : '0.00';

    return (
        <aside className="w-[280px] bg-operator-bg border-r border-operator-border p-6 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
            {/* LOGO SPACE */}
            <div className="mb-8 flex items-center">
                <svg className="h-10 w-auto block text-white hover:text-sieben transition-all duration-300 ease-in-out hover:drop-shadow-[0_0_8px_rgba(124,92,255,0.6)] cursor-pointer" viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SIEBEN CAPITAL Logo">
                    <defs>
                        <style type="text/css">
                            {`@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@500;800&display=swap');`}
                        </style>
                    </defs>

                    <g id="S7-Symbol">
                        <rect x="0" y="16" width="6" height="32" fill="currentColor" />
                        <rect x="10" y="8" width="6" height="40" fill="currentColor" />
                        <rect x="20" y="0" width="6" height="48" fill="currentColor" />
                        <rect x="30" y="8" width="6" height="40" fill="currentColor" />
                        <rect x="40" y="20" width="6" height="28" fill="currentColor" />
                        <rect x="50" y="32" width="6" height="16" fill="currentColor" />
                        <rect x="60" y="0" width="6" height="48" fill="currentColor" />
                    </g>

                    <g id="Wordmark" transform="translate(82, 0)">
                        <text x="0" y="28"
                            fill="#7C5CFF"
                            fontFamily="'Oxanium', cursive"
                            fontWeight="800"
                            fontSize="24"
                            letterSpacing="-0.02em">SIEBEN</text>

                        <text x="0" y="44"
                            fill="currentColor"
                            fontFamily="'Oxanium', cursive"
                            fontWeight="500"
                            fontSize="12"
                            letterSpacing="0.15em">CAPITAL</text>
                    </g>
                </svg>
            </div>

            <div className="space-y-6">

                {/* LIVE DATA PANEL */}
                {marketData && (
                    <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-[9px] font-black uppercase text-blue-400">Live Data Stream</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mb-3">
                            <div className="flex flex-col">
                                <span className="text-zinc-600">Close</span>
                                <span className="text-white font-bold">{marketData.PRICE?.candle?.close || '---'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-zinc-600">VIX</span>
                                <span className="text-white font-bold">{marketData.MGI_MACRO?.VIX || '---'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-zinc-600">Day Shape</span>
                                <span className="text-emerald-400">{marketData.MGI_MACRO?.SHAPE_DIA_ANTERIOR || '---'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-zinc-600">T. Vol</span>
                                <span className="text-zinc-400">{marketData.MGI_MACRO?.VOLUMEN_T1 || '---'}</span>
                            </div>
                        </div>

                        {/* RAW JSON INSPECTOR */}
                        <div className="border-t border-white/5 pt-2">
                            <details className="group">
                                <summary className="flex items-center gap-2 cursor-pointer text-[9px] font-mono text-zinc-500 hover:text-white mb-2 list-none">
                                    <span className="group-open:rotate-90 transition-transform">▸</span> Raw JSON Payload
                                </summary>
                                <pre className="text-[8px] font-mono text-zinc-400 bg-black/50 p-2 rounded-lg overflow-x-auto max-h-[150px] custom-scrollbar">
                                    {JSON.stringify(marketData, null, 2)}
                                </pre>
                            </details>
                        </div>
                    </div>
                )}

                {/* RAW JSON INSPECTOR */}
                {marketData && (
                    <div className="pt-2">
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer text-[9px] font-mono text-operator-muted hover:text-operator-text mb-2 list-none">
                                <span className="group-open:rotate-90 transition-transform">▸</span> Raw JSON Payload
                            </summary>
                            <pre className="text-[8px] font-mono text-operator-muted bg-operator-card p-3 rounded-md border border-operator-border overflow-x-auto max-h-[150px] custom-scrollbar">
                                {JSON.stringify(marketData, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}

                <div className="bg-operator-bg border border-operator-border p-4 rounded-md space-y-4">
                    <div className="flex items-center gap-2"><Wallet size={14} className="text-sieben" /><span className="text-[10px] font-bold uppercase text-operator-text">Tesorería (USD)</span></div>
                    <div className="space-y-1">
                        <span className="text-[8px] text-operator-muted uppercase font-bold tracking-widest">Account Balance</span>
                        <div className="flex items-center bg-operator-card border border-operator-border rounded-md px-3 py-2 focus-within:border-sieben transition-colors">
                            <span className="text-xs text-operator-muted mr-2">$</span>
                            <input
                                type="number"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                className="w-full bg-transparent border-none text-xs font-mono text-operator-text outline-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] text-operator-muted uppercase font-bold tracking-widest">Drawdown Máx (%)</span>
                        <div className="flex items-center bg-operator-card border border-operator-border rounded-md px-3 py-2 focus-within:border-sieben transition-colors">
                            <input
                                type="number"
                                value={drawdownMax}
                                onChange={(e) => setDrawdownMax(e.target.value)}
                                className="w-full bg-transparent border-none text-xs font-mono text-rose-500 outline-none p-0 focus:ring-0"
                            />
                            <span className="text-xs text-operator-muted ml-2">%</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] text-operator-muted uppercase font-bold tracking-widest">Margen / Contrato</span>
                        <div className="flex items-center bg-operator-card border border-operator-border rounded-md px-3 py-2 focus-within:border-sieben transition-colors">
                            <span className="text-xs text-operator-muted mr-2">$</span>
                            <input
                                type="number"
                                value={marginPerContract}
                                onChange={(e) => setMarginPerContract(e.target.value)}
                                className="w-full bg-transparent border-none text-xs font-mono text-operator-text outline-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {apiError && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-500">
                        <AlertTriangle size={14} />
                        <span className="text-[9px] font-black uppercase">Critical Fault</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">{apiError}</p>
                    <button onClick={onOpenKeyDialog} className="mt-1 w-full bg-rose-500 py-1.5 rounded text-[9px] font-black text-white uppercase hover:bg-rose-600 transition-colors">Change API Key</button>
                </div>
            )}

            {/* SESSION HISTORY (TERMINAL STYLE) */}
            <div className="pt-6 border-t border-operator-border mt-6 space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[10px] font-bold text-operator-muted uppercase tracking-widest flex items-center gap-1.5 hover:text-operator-text transition-colors cursor-pointer" onClick={onNewChat} title="Nueva Sesión">
                        <MessageSquare size={12} />
                        Historial de Sesión
                    </h3>
                    <button onClick={onNewChat} className="text-operator-muted hover:text-sieben transition-colors" title="Nueva Sesión">
                        <Plus size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 pb-4">
                    {historyItems.length === 0 ? (
                        <p className="text-[9px] font-mono text-operator-muted py-4">{'// No history'}</p>
                    ) : (
                        historyItems.map((item, idx) => {
                            const date = new Date(item.timestamp);
                            const title = item.status === 'READY' ? 'Plan de Vuelo' : (item.type || 'Sys Output');
                            const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            return (
                                <div
                                    key={item.id || idx}
                                    onClick={() => onSelectHistoryItem(item)}
                                    className="p-3 rounded-md bg-operator-card border border-operator-border cursor-pointer transition-colors hover:border-sieben flex flex-col group"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[9px] font-bold text-operator-text uppercase tracking-wider group-hover:text-sieben truncate">{title}</span>
                                        <span className="text-[9px] font-mono text-operator-muted">{timeStr}</span>
                                    </div>
                                    <span className="text-[9px] text-operator-muted line-clamp-1 font-mono">{item.input || '...'}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* SESSION EXPORT */}
            <div className="mt-auto pt-6 border-t border-operator-border space-y-3">
                <button
                    onClick={onExportSession}
                    disabled={!hasData}
                    className="w-full flex items-center justify-center gap-2 bg-operator-card hover:bg-[#1A1A1A] disabled:opacity-50 border border-operator-border py-2.5 rounded-md text-[9px] font-bold text-operator-text uppercase tracking-widest transition-all"
                >
                    <Download size={14} />
                    Export Session .md
                </button>
            </div>
        </aside>
    );
}
