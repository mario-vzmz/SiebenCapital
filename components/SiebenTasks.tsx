import * as React from 'react';
import { useEffect, useState } from 'react';
import {
    BriefcaseBusiness,
    PlayCircle,
    BarChart,
    RotateCw,
    CheckCircle,
    FileText,
    LogOut,
    Clock
} from 'lucide-react';
import { useTaskScheduler } from '../src/hooks/useTaskScheduler';

export type TaskId =
    | 'planVuelo'
    | 'apertura'
    | 'actualizacion'
    | 'gestionTrade'
    | 'tradeLog'

    | 'cierreDia';

export interface TaskButton {
    id: TaskId;
    label: string;
    enabled: boolean;
    onClick: () => void;
}

interface SiebenTasksProps {
    onPlanVuelo: () => void;
    onApertura: () => void;

    onActualizacion: () => void;
    onGestionTrade: () => void;
    onTradeLog: () => void;
    onCierreDia: () => void;
    isProcessing: boolean;
}

export function SiebenTasks({
    onPlanVuelo,
    onApertura,

    onActualizacion,
    onGestionTrade,
    onTradeLog,
    onCierreDia,
    isProcessing
}: SiebenTasksProps) {

    const { tasks, currentTime } = useTaskScheduler();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const getIcon = (id: string) => {
        switch (id) {
            case 'planVuelo': return <BriefcaseBusiness size={16} />;
            case 'apertura': return <PlayCircle size={16} />;

            case 'actualizacion': return <RotateCw size={16} />;
            case 'gestionTrade': return <CheckCircle size={16} />;
            case 'tradeLog': return <FileText size={16} />;
            case 'cierreDia': return <LogOut size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getAction = (id: string) => {
        switch (id) {
            case 'planVuelo': return onPlanVuelo;
            case 'apertura': return onApertura;

            case 'actualizacion': return onActualizacion;
            case 'gestionTrade': return onGestionTrade;
            case 'tradeLog': return onTradeLog;
            case 'cierreDia': return onCierreDia;
            default: return () => { };
        }
    };

    const formatTaskTime = (date: Date) => {
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    return (
        <aside className="w-[300px] bg-[#050505] border-l border-white/5 p-6 flex flex-col h-full overflow-hidden">

            {/* HEADER: CLOCK & STATUS */}
            <div className="mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} className="text-emerald-500 animate-pulse" />
                        SIEBEN TASKS
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500">{formatTaskTime(currentTime)} CDMX</span>
                </div>
                <p className="text-[8px] text-zinc-600 font-mono">
                    Protocolo Algorítmico Activo
                </p>
            </div>

            {/* TASK LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {tasks.map((task) => {
                    const isActive = activeTaskId === task.id;
                    const isDisabled = !task.isEnabled || isProcessing;

                    return (
                        <button
                            key={task.id}
                            onClick={() => {
                                setActiveTaskId(task.id);
                                getAction(task.id)();
                            }}
                            disabled={isDisabled}
                            className={`
                w-full p-4 rounded-xl flex items-center justify-between transition-all group relative overflow-hidden border
                ${isDisabled
                                    ? 'bg-zinc-900/40 border-white/5 opacity-50 cursor-not-allowed grayscale'
                                    : isActive
                                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40 translate-x-1'
                                        : 'bg-[#0A0A0A] border-white/5 hover:bg-zinc-900 hover:border-white/10 hover:translate-x-1'
                                }
            `}
                        >
                            {/* Status Indicator Dot */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDisabled ? 'bg-transparent' : isActive ? 'bg-white' : 'bg-emerald-500/50 group-hover:bg-emerald-400'}`} />

                            <div className="flex items-center gap-3">
                                <div className={`${isDisabled ? 'text-zinc-600' : isActive ? 'text-white' : 'text-zinc-400 group-hover:text-emerald-400'}`}>
                                    {getIcon(task.id)}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDisabled ? 'text-zinc-600' : isActive ? 'text-white' : 'text-zinc-300'}`}>
                                        {task.label}
                                    </span>
                                    <span className={`text-[8px] font-mono ${isDisabled ? 'text-zinc-700' : 'text-zinc-500'}`}>
                                        {task.mode === 'auto' ? 'Auto-Trigger' : 'Manual Exec'}
                                    </span>
                                </div>
                            </div>

                            {/* Micro-Interaction Arrow */}
                            {!isDisabled && (
                                <div className={`opacity-0 group-hover:opacity-100 transition-opacity -mr-2 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                    →
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* FOOTER: SYSTEM STATUS */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-zinc-600">
                    <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-bounce' : 'bg-emerald-500'}`} />
                    {isProcessing ? 'PROCESANDO SOLICITUD...' : 'SISTEMA EN ESPERA'}
                </div>
            </div>

        </aside>
    );
}
