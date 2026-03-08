import * as React from 'react';
import { useRef, useEffect } from 'react';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { Deliberation } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgentFeedProps {
    deliberations: Deliberation[];
    onReset: () => void;
    isProcessing: boolean;
    phase: string;
}

export function AgentFeed({ deliberations, onReset, isProcessing, phase }: AgentFeedProps) {
    const feedEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [deliberations.length, isProcessing, phase]);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 w-full px-2 md:px-0">
            {deliberations.map((delib) => (
                <div key={delib.id} className="animate-copilot-up">
                    <details
                        className="group bg-operator-card border border-operator-border rounded-md overflow-hidden"
                        open={true}
                    >
                        <summary className="cursor-pointer p-4 md:p-5 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors list-none">
                            <div className="flex items-center gap-4">
                                <ShieldCheck size={18} className={delib.status === 'READY' ? 'text-sieben' : 'text-rose-500'} />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-operator-text">
                                    [SIEGE-AI] {delib.input}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-mono text-operator-muted">{new Date(delib.timestamp).toLocaleTimeString()}</span>
                                <span className="text-operator-muted text-[10px] font-mono group-open:rotate-180 transition-transform">▼</span>
                            </div>
                        </summary>

                        <div className="p-6 md:p-8 border-t border-operator-border bg-operator-bg font-sans text-[13px] leading-relaxed text-operator-text w-full break-words">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                    table: ({ node, ...props }) => (
                                        <div className="overflow-x-auto w-full my-6 custom-scrollbar">
                                            <table className="w-full border-collapse" {...props} />
                                        </div>
                                    ),
                                    th: ({ node, ...props }) => <th className="border border-operator-border bg-operator-card p-2 text-left font-bold text-sieben whitespace-nowrap" {...props} />,
                                    td: ({ node, ...props }) => <td className="border border-operator-border p-2 text-operator-text" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="text-operator-text font-bold" {...props} />,
                                    h1: ({ node, ...props }) => <h1 className="text-lg md:text-xl font-bold text-operator-text mt-8 mb-4 uppercase tracking-[0.2em] border-b border-operator-border pb-2 leading-tight" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-base md:text-lg font-bold text-operator-text mt-6 mb-3 border-l-2 border-sieben pl-3 leading-snug" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-sm md:text-base font-bold text-operator-muted mt-5 mb-2 leading-snug" {...props} />,
                                    li: ({ node, ...props }) => <li className="ml-5 mb-1 list-[square] marker:text-sieben" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="mb-4 space-y-1" {...props} />,
                                }}
                            >
                                {delib.output.replace(/^- Parámetros Recibidos:.*$/gm, '').replace(/^- Desglose Aritmético:.*$/gm, '')}
                            </ReactMarkdown>
                        </div>
                    </details>
                </div>
            ))}
            <div ref={feedEndRef} />

            {phase === 'LAUNCHED' && !isProcessing && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={onReset}
                        className="px-6 py-3 bg-operator-card border border-operator-border rounded-md text-[10px] font-bold uppercase tracking-widest text-operator-muted hover:text-white hover:border-sieben transition-all"
                    >
                        Nueva Sesión (Reset Engine)
                    </button>
                </div>
            )}
        </div>
    );
}
