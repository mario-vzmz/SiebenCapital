import * as React from 'react';
import { useState } from 'react';
import { FileText, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TradeLogInput } from '../types';
import { calculateRiskUnits } from '../src/utils/riskCalculator';

interface TradeLogDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (log: Omit<TradeLogInput, 'trade_id'>) => void;
    currentTradeName?: string;
}

export function TradeLogDialog({ isOpen, onClose, onSubmit, currentTradeName }: TradeLogDialogProps) {
    const [outcome, setOutcome] = useState<'WINNER' | 'LOSSER' | 'BREAK_EVEN' | 'VETOED'>('WINNER');
    const [puntos, setPuntos] = useState("");
    const [tipoDia, setTipoDia] = useState("Tendencia");
    const [notes, setNotes] = useState("");
    // Balance local como ref rápida; idealmente viene por prop
    const balanceStr = localStorage.getItem("SIEBEN_BALANCE_USD") || "50000";
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0f1c]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white/[0.02] p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <FileText className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]" style={{ fontFamily: "'Oxanium', cursive" }}>Cierre de Operación</h3>
                            <p className="text-[10px] text-emerald-500/40 font-mono uppercase tracking-widest mt-1">Audit // {currentTradeName || 'SIEBEN_EXECUTION'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">
                    <div>
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4 block text-center" style={{ fontFamily: "'Oxanium', cursive" }}>Outcome de la Subasta</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: 'WINNER', label: 'WIN', icon: <TrendingUp size={16} />, color: 'emerald' },
                                { id: 'LOSSER', label: 'LOSS', icon: <TrendingDown size={16} />, color: 'rose' },
                                { id: 'BREAK_EVEN', label: 'B.E.', icon: <Minus size={16} />, color: 'zinc' },
                                { id: 'VETOED', label: 'VETO', icon: <X size={16} />, color: 'cyan' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setOutcome(opt.id as any)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 ${outcome === opt.id
                                        ? `bg-${opt.color}-500/20 border-${opt.color}-500/50 text-white shadow-[0_0_15px_rgba(var(--${opt.color}-rgb),0.2)]`
                                        : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/10 hover:bg-white/5'
                                        }`}
                                >
                                    {opt.icon}
                                    <span className="text-[9px] font-black tracking-widest" style={{ fontFamily: "'Oxanium', cursive" }}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Resultado (Puntos)</label>
                            <input
                                type="number"
                                value={puntos}
                                onChange={(e) => setPuntos(e.target.value)}
                                placeholder="Ej: +45.25"
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none hover:bg-white/[0.05]"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Contexto del Día</label>
                            <select
                                value={tipoDia}
                                onChange={(e) => setTipoDia(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer hover:bg-white/[0.05]"
                                style={{ fontFamily: "'Oxanium', cursive" }}
                            >
                                <option value="Tendencia">TREND_DAY</option>
                                <option value="Balance">BALANCE_DAY</option>
                                <option value="Rango">RANGE_DAY</option>
                                <option value="Neutral">CHOP_NOISE</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Notas de Sesión (Insights)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Psicología del trade, errores cometidos o lecciones..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-all min-h-[100px] placeholder:text-white/10 hover:bg-white/[0.05]"
                        />
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
                                const valStr = puntos.trim();
                                if (valStr) {
                                    let val = parseFloat(valStr);
                                    if (outcome === 'LOSSER' && val > 0) val = -val;
                                    const rValue = parseFloat((val / 40).toFixed(2));
                                    onSubmit({ outcome, puntos: val, final_r: rValue, tipo_dia: tipoDia, user_notes: notes });
                                }
                            }}
                            disabled={!puntos}
                            className="px-10 py-3.5 bg-emerald-500 rounded-xl text-[10px] font-black text-[#050810] hover:bg-emerald-400 transition-all uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-95"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Archivar Operación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
