import * as React from 'react';
import { useState } from 'react';
import { Target, X } from 'lucide-react';
import { TradeInput } from '../types';

interface TradeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (trade: TradeInput) => void;
}

export function TradeDialog({ isOpen, onClose, onSubmit }: TradeDialogProps) {
    const [setup, setSetup] = useState("");
    const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
    const [contracts, setContracts] = useState("1");
    const [entry, setEntry] = useState("");
    const [stop, setStop] = useState("");
    const [tp1, setTp1] = useState("");
    const [tp2, setTp2] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0f1c]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white/[0.02] p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Target className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]" style={{ fontFamily: "'Oxanium', cursive" }}>Nueva Ejecución</h3>
                            <p className="text-[10px] text-emerald-500/40 font-mono uppercase tracking-widest mt-1">Tactical Action Flow // Axe Signal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Nombre del Setup</label>
                        <input
                            value={setup}
                            onChange={(e) => setSetup(e.target.value)}
                            placeholder="Ej: VWAP_REJECTION_V1"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10 hover:bg-white/[0.05]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Dirección</label>
                            <div className="flex bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden p-1.5 backdrop-blur-md">
                                <button
                                    onClick={() => setDirection('LONG')}
                                    className={`flex-1 py-3 text-[10px] font-black tracking-[0.15em] uppercase rounded-lg transition-all duration-300 ${direction === 'LONG' ? 'bg-emerald-500 text-[#050810] shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                                    style={{ fontFamily: "'Oxanium', cursive" }}
                                >
                                    LONG
                                </button>
                                <button
                                    onClick={() => setDirection('SHORT')}
                                    className={`flex-1 py-3 text-[10px] font-black tracking-[0.15em] uppercase rounded-lg transition-all duration-300 ${direction === 'SHORT' ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                                    style={{ fontFamily: "'Oxanium', cursive" }}
                                >
                                    SHORT
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Contratos (MNQ)</label>
                            <input
                                type="number"
                                min="1"
                                value={contracts}
                                onChange={(e) => setContracts(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-all text-center hover:bg-white/[0.05]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Límite', val: entry, set: setEntry, color: 'emerald' },
                            { label: 'Stop', val: stop, set: setStop, color: 'rose' },
                            { label: 'TP1', val: tp1, set: setTp1, color: 'emerald' },
                            { label: 'TP2', val: tp2, set: setTp2, color: 'cyan' },
                        ].map((field) => (
                            <div key={field.label} className="space-y-2">
                                <label className={`text-[9px] font-black uppercase tracking-tighter text-center block ${field.color === 'rose' ? 'text-rose-400' : 'text-zinc-500'}`} style={{ fontFamily: "'Oxanium', cursive" }}>{field.label}</label>
                                <input
                                    type="number"
                                    value={field.val}
                                    onChange={(e) => field.set(e.target.value)}
                                    className={`w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-xs font-mono text-white focus:outline-none transition-all text-center hover:bg-white/[0.05] ${field.color === 'rose' ? 'focus:border-rose-500/50 text-rose-300' : 'focus:border-emerald-500/50'}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-3.5 rounded-xl border border-white/5 text-[10px] font-black text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Abortar
                        </button>
                        <button
                            onClick={() => {
                                const c = parseInt(contracts, 10);
                                const e = parseFloat(entry);
                                const s = parseFloat(stop);
                                const t1 = parseFloat(tp1);
                                const t2 = tp2 ? parseFloat(tp2) : undefined;
                                if (setup && !isNaN(c) && c > 0 && !isNaN(e) && !isNaN(s) && !isNaN(t1)) {
                                    onSubmit({ setup_name: setup, direction, contracts: c, entry_price: e, stop_loss: s, tp1_price: t1, tp2_price: t2 });
                                }
                            }}
                            disabled={!setup || !contracts || !entry || !stop || !tp1}
                            className="px-10 py-3.5 bg-emerald-500 rounded-xl text-[10px] font-black text-[#050810] hover:bg-emerald-400 transition-all uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-95"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Iniciar Gestión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
