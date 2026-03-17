import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface ChatBarProps {
    onSend: (message: string) => void;
    isProcessing: boolean;
}

export const ChatBar: React.FC<ChatBarProps> = ({ onSend, isProcessing }) => {
    const [internalInput, setInternalInput] = useState("");

    const handleSend = () => {
        if (!internalInput.trim() || isProcessing) return;
        onSend(internalInput);
        setInternalInput(""); // Clear immediately for UX after sending
    };

    return (
        <div className="p-8 bg-transparent flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl px-6 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] focus-within:border-cyan-500/50 transition-all duration-300 group">
                <div className="flex-1 relative">
                    <input
                        value={internalInput}
                        onChange={(e) => setInternalInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Comandos, análisis o consultas tácticas..."
                        className="w-full bg-transparent border-none py-3 text-[13px] font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-0"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    {!internalInput && (
                        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none opacity-20 group-focus-within:opacity-40">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400" style={{ fontFamily: "'Oxanium', cursive" }}>READY_FOR_INPUT</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSend}
                    disabled={!internalInput.trim() || isProcessing}
                    className={`p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                        isProcessing 
                            ? 'bg-cyan-500/10 text-cyan-400 opacity-50' 
                            : 'bg-white/5 hover:bg-cyan-500 text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                    }`}
                >
                    <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>
    );
};
