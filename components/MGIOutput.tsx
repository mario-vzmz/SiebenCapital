import React from 'react';
import { BarChart3, Users, RefreshCw, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MGIOutputProps {
    mgiDashboard: string;
    mentalCheck: string;
    setMentalCheck: (val: string) => void;
    launchFlightPlan: () => void;
    isProcessing: boolean;
}

export function MGIOutput({
    mgiDashboard,
    mentalCheck,
    setMentalCheck,
    launchFlightPlan,
    isProcessing
}: MGIOutputProps) {
    return (
        <div className="w-full space-y-8 animate-copilot-up pb-12 px-4 md:px-8">
            <div className="w-full">
                <div className="flex items-center gap-4 mb-6 border-b border-operator-border pb-4">
                    <div className="p-2 border border-sieben bg-sieben/10 rounded-md"><BarChart3 className="text-sieben" size={18} /></div>
                    <div>
                        <h3 className="text-[12px] font-bold uppercase text-operator-text tracking-widest">TABLERO MGI CARGADO</h3>
                        <p className="text-[10px] font-mono text-operator-muted">FASE 1: DIAGNÓSTICO ESTRUCTURAL</p>
                    </div>
                </div>

                <div className="mb-8 bg-operator-bg p-6 rounded-md border border-operator-border text-operator-text w-full min-w-0">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            table: ({ node, ...props }) => (
                                <div className="overflow-x-auto w-full my-8 custom-scrollbar rounded-2xl border border-white/10 bg-[#0a0f1c]/40 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                                    <table className="w-full border-collapse table-auto" {...props} />
                                </div>
                            ),
                            th: ({ node, ...props }) => (
                                <th className="border-b border-white/10 bg-white/[0.05] p-4 text-left font-black text-emerald-400 text-[10px] uppercase tracking-[0.2em] whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                                    style={{ fontFamily: "'Oxanium', cursive" }} {...props} />
                            ),
                            td: ({ node, ...props }) => (
                                <td className="border-b border-white/5 p-4 text-zinc-300 font-mono text-[11px] whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] hover:bg-white/[0.01] transition-colors" {...props} />
                            ),
                            strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-white mt-12 mb-6 uppercase tracking-[0.1em] border-b border-white/10 pb-4" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-black text-white/90 mt-10 mb-5 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-md font-bold text-emerald-500 mt-8 mb-4 uppercase tracking-wide" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                            p: ({ node, ...props }) => <p className="mb-6 last:mb-0 text-[15px] leading-relaxed break-words" {...props} />,
                            li: ({ node, ...props }) => <li className="ml-4 mb-3 list-none relative before:content-[''] before:absolute before:-left-4 before:top-2.5 before:w-1.5 before:h-px before:bg-emerald-500/50 text-[15px] break-words" {...props} />,
                            ul: ({ node, ...props }) => <ul className="mb-6 space-y-3 w-full" {...props} />,
                        }}
                    >
                        {mgiDashboard}
                    </ReactMarkdown>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-operator-bg rounded-md border border-operator-border flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Users size={12} className="text-operator-muted" />
                            <span className="text-[9px] font-bold uppercase text-operator-muted tracking-widest">Wendy Check-in Mental</span>
                        </div>
                        <textarea
                            value={mentalCheck}
                            onChange={(e) => setMentalCheck(e.target.value)}
                            placeholder="Enfoque de hoy, variables externas..."
                            className="w-full bg-operator-bg border border-operator-border rounded-md p-3 text-[11px] font-mono text-operator-text focus:outline-none focus:border-sieben transition-all min-h-[80px]"
                        />
                    </div>
                    <button
                        onClick={launchFlightPlan}
                        disabled={!mentalCheck.trim() || isProcessing}
                        className="w-full py-4 bg-sieben text-white rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sieben-light hover:text-black transition-all disabled:opacity-50 disabled:bg-operator-border border border-transparent disabled:border-operator-border"
                    >
                        {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                        Confirmar y Lanzar Fase 2
                    </button>
                </div>
            </div>
        </div>
    );
}
