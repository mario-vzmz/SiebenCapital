import React from 'react';
import { Power, X, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export function CierreDiaDialog({ isOpen, onClose, onSubmit }: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#020617]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0f1c]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">

                {/* Header */}
                <div className="bg-white/[0.02] p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                            <Power className="text-rose-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]" style={{ fontFamily: "'Oxanium', cursive" }}>Cierre de Sesión</h3>
                            <p className="text-[10px] text-rose-500/40 font-mono uppercase tracking-widest mt-1">System Halt // Protocol Red</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="inline-block p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
                            <AlertCircle className="text-rose-500" size={32} />
                        </div>
                        <p className="text-[13px] text-zinc-400 font-medium leading-relaxed">
                            ¿Estás seguro de que deseas finalizar la jornada? <br />
                            <span className="text-[10px] text-white/20 uppercase tracking-widest mt-2 block" style={{ fontFamily: "'Oxanium', cursive" }}>Toda actividad no archivada se perderá</span>
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onSubmit}
                            className="w-full py-4 bg-rose-500 rounded-xl text-[10px] font-black text-white hover:bg-rose-400 transition-all uppercase tracking-[0.25em] shadow-[0_0_25px_rgba(244,63,94,0.3)] active:scale-95"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Confirmar Shutdown
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-xl border border-white/5 text-[10px] font-black text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
                            style={{ fontFamily: "'Oxanium', cursive" }}
                        >
                            Mantener Conexión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
