import * as React from 'react';
import { useState } from 'react';
import { BrainCircuit, X } from 'lucide-react';

export interface WendyCheckInput {
    mentalCheck: string;
    energyLevel: 'Bajo' | 'Medio' | 'Alto';
    distractions: 'Ninguna' | 'Leves' | 'Altas';
}

interface MentalCheckDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: WendyCheckInput) => void;
}

export function MentalCheckDialog({ isOpen, onClose, onSubmit }: MentalCheckDialogProps) {
    const [mentalCheck, setMentalCheck] = useState("");
    const [energyLevel, setEnergyLevel] = useState<'Bajo' | 'Medio' | 'Alto'>('Medio');
    const [distractions, setDistractions] = useState<'Ninguna' | 'Leves' | 'Altas'>('Ninguna');
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0f1c]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white/[0.02] p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <BrainCircuit className="text-cyan-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]" style={{ fontFamily: "'Oxanium', cursive" }}>Protocolo Wendy Rhoades</h3>
                            <p className="text-[10px] text-cyan-500/40 font-mono uppercase tracking-widest mt-1">Mental State Audit // Pre-Market</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">
                    <div className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-cyan-500/50 before:to-transparent">
                        <p className="text-[13px] text-zinc-400 font-medium italic leading-relaxed">
                            "El mercado es un espejo. Si entras con ruido, recibirás ruido. 
                            Purifica tu intención antes de la subasta."
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Nivel de Energía</label>
                            <select
                                value={energyLevel}
                                onChange={(e) => setEnergyLevel(e.target.value as any)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer hover:bg-white/[0.05]"
                            >
                                <option value="Alto">ALTO_VOLTAJE</option>
                                <option value="Medio">OPTIMO</option>
                                <option value="Bajo">REDUCIDO</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Distracciones</label>
                            <select
                                value={distractions}
                                onChange={(e) => setDistractions(e.target.value as any)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer hover:bg-white/[0.05]"
                            >
                                <option value="Ninguna">MODO_ZEN</option>
                                <option value="Leves">MINOR_NOISE</option>
                                <option value="Altas">CRITICAL_SMOG</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] text-white/30 font-black uppercase tracking-widest ml-1" style={{ fontFamily: "'Oxanium', cursive" }}>Estado Emocional</label>
                        <textarea
                            value={mentalCheck}
                            onChange={(e) => setMentalCheck(e.target.value)}
                            placeholder="Describe tu balance emocional actual..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-all min-h-[140px] placeholder:text-white/10 hover:bg-white/[0.05]"
                            autoFocus
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
                                if (mentalCheck.trim()) onSubmit({ mentalCheck, energyLevel, distractions });
                            }}
                            disabled={!mentalCheck.trim()}
                            className="px-10 py-3.5 bg-cyan-500 rounded-xl text-[10px] font-black text-[#050810] hover:bg-cyan-400 transition-all uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(34,211,238,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed active:scale-95"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Confirmar Enlace
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
