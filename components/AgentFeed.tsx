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
        <div className="w-full space-y-12 pb-20 px-4 md:px-8">
            {deliberations.map((delib) => (
                <div key={delib.id} className="animate-copilot-up group w-full min-w-0">
                    {/* User Prompt Header */}
                    <div className="flex items-start gap-4 mb-8 opacity-80 group-hover:opacity-100 transition-opacity w-full min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 group-hover:text-cyan-400 transition-colors block whitespace-pre-wrap [word-break:break-all] [overflow-wrap:anywhere] leading-relaxed"
                                  style={{ fontFamily: "'Oxanium', cursive" }}>
                                {delib.input}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="h-px w-8 bg-gradient-to-r from-white/10 to-transparent" />
                            <span className="text-[9px] font-mono text-zinc-600 tabular-nums">{new Date(delib.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>

                    {/* AI Response Area */}
                    <div className="text-[15px] leading-relaxed text-zinc-300 w-full min-w-0 break-words selection:bg-cyan-500/30">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-6 last:mb-0 whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]" {...props} />,
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-6 border border-white/10 rounded-lg">
                                        <table className="w-full border-collapse text-left" {...props} />
                                    </div>
                                ),
                                th: ({ node, ...props }) => (
                                    <th className="border-b border-white/10 bg-white/5 p-3 text-[10px] font-black uppercase tracking-wider text-cyan-400" 
                                        style={{ fontFamily: "'Oxanium', cursive" }} {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="border-b border-white/5 p-3 text-zinc-400 font-mono text-[11px]" {...props} />
                                ),
                                strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-white mt-12 mb-6 uppercase tracking-[0.1em] border-b border-white/10 pb-4" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-black text-white/90 mt-10 mb-5 uppercase tracking-wider" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-md font-bold text-cyan-500 mt-8 mb-4 uppercase tracking-wide" style={{ fontFamily: "'Oxanium', cursive" }} {...props} />,
                                li: ({ node, ...props }) => <li className="ml-4 mb-2 list-none relative before:content-[''] before:absolute before:-left-4 before:top-2.5 before:w-1.5 before:h-px before:bg-cyan-500/50 block whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]" {...props} />,
                                ul: ({ node, ...props }) => <ul className="mb-6 space-y-2 w-full min-w-0" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-white/5 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-[12px] whitespace-normal [word-break:break-all]" {...props} />,
                                pre: ({ node, ...props }) => <pre className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 my-6 overflow-x-auto custom-scrollbar whitespace-pre-wrap [word-break:break-all]" {...props} />,
                            }}
                        >
                            {delib.output || ''}
                        </ReactMarkdown>
                    </div>
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
