import * as React from 'react';
import { Target, Shield, Zap, Clock, Activity, AlertCircle } from 'lucide-react';
import { AMTSetupResponse, AMTSetupData } from '../types';
import { apiUrl } from '../src/utils/api';

export function AMTPanel() {
    const [data, setData] = React.useState<AMTSetupData | null>(null);
    const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [countdown, setCountdown] = React.useState<string>('--:--:--');

    const fetchSetup = async () => {
        try {
            const res = await fetch(apiUrl('/api/amt/setup'));
            if (res.ok) {
                const json: AMTSetupResponse = await res.json();
                if (json.status === 'success' && json.setup_json) {
                    setData(json.setup_json);
                    setLastUpdate(json.timestamp || null);
                } else {
                    setData(null);
                }
            }
        } catch (e) {
            console.error("Error fetching AMT setup:", e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchSetup();
        const interval = setInterval(fetchSetup, 30000); // 30s polling
        return () => clearInterval(interval);
    }, []);

    // Countdown logic to 10:00 CT
    React.useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            // 10:00 CT is usually 15:00 UTC (during DST) or 16:00 UTC
            // For simplicity, let's assume the user's local 10:00 or a specific offset
            // Better: calculate relative to "today at 10:00 AM" in a specific TZ.
            // But let's just do a generic 10:00 local for now or fixed time.
            const target = new Date();
            target.setHours(10, 0, 0, 0);
            
            if (now > target) {
                setCountdown('IB CLOSED');
                return;
            }

            const diff = target.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                <Activity className="text-cyan-400 animate-spin" size={24} />
            </div>
        );
    }

    const setup = data?.setup;
    const conviction = setup?.conviccion || 'NONE';

    const getSemaphoreColor = () => {
        switch (conviction) {
            case 'MAXIMA': return 'bg-emerald-400 shadow-[0_0_15px_#10b981] animate-pulse';
            case 'ALTA': return 'bg-emerald-500 shadow-[0_0_10px_#10b981]';
            case 'MODERADA': return 'bg-amber-400 shadow-[0_0_10px_#fbbf24]';
            default: return 'bg-zinc-600';
        }
    };

    return (
        <div className="bg-[#0f172a]/60 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-500 ${
                conviction === 'MAXIMA' ? 'bg-emerald-500' : conviction === 'ALTA' ? 'bg-emerald-600' : conviction === 'MODERADA' ? 'bg-amber-500' : 'bg-zinc-800'
            }`} />

            <div className="flex flex-col gap-6 relative z-10">
                {/* Header: Conviction Semester + Title */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${getSemaphoreColor()} transition-all duration-500`} />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">AMT Setup Monitor</span>
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                                {setup ? setup.nombre : 'Esperando IB...'}
                            </h2>
                        </div>
                    </div>
                    {setup && (
                         <div className="flex flex-col items-end">
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                {(setup.bateo_historico * 100).toFixed(0)}% <span className="text-zinc-500 font-normal">· n={setup.n_sesiones}</span>
                            </span>
                            <span className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold mt-1">Edge Estadístico</span>
                         </div>
                    )}
                </div>

                {!setup ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-white/5 rounded-xl">
                        <Clock className="text-zinc-700 animate-pulse" size={32} />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-mono text-zinc-400 font-bold tracking-widest">{countdown}</span>
                            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-black mt-1">Countdown to IB Close</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Action Bar */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Acción Sugerida</span>
                                <div className="flex items-center gap-2">
                                    <Zap className={setup.accion_sugerida.includes('LONG') ? 'text-emerald-400' : 'text-rose-400'} size={16} />
                                    <span className="text-lg font-black text-white">{setup.accion_sugerida}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1 block">Nivel de Entrada</span>
                                <span className="text-xl font-mono text-white font-black">{setup.nivel_entrada.toLocaleString()} <span className="text-[10px] text-zinc-500">pts</span></span>
                            </div>
                        </div>

                        {/* Targets & Stop Matrix */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Stop Loss', val: setup.stop_sugerido, color: 'text-rose-400', icon: Shield },
                                { label: 'Target Q50', val: setup.target_q50, color: 'text-white', icon: Target },
                                { label: 'Target Q75', val: setup.target_q75, color: 'text-emerald-400', icon: Target },
                                { label: 'Target Q90', val: setup.target_q90, color: 'text-cyan-400', icon: Target },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-3 group/item hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-zinc-600 group-hover/item:text-zinc-400 transition-colors">
                                        <item.icon size={10} />
                                        <span className="text-[8px] uppercase tracking-widest font-black">{item.label}</span>
                                    </div>
                                    <span className={`text-[15px] font-mono font-black tabular-nums ${item.color}`}>
                                        {item.val.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Footer info */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-mono">
                                <Activity size={12} />
                                <span>IB Range: {data.ib_classification.range} pts</span>
                                <span className="mx-1 opacity-30">|</span>
                                <span>IB: {data.ib_classification.clasificacion}</span>
                            </div>
                            {lastUpdate && (
                                <span className="text-[9px] text-zinc-700 font-mono">
                                    Generated: {new Date(lastUpdate).toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
