import * as React from 'react';
import { useState, useEffect } from 'react';
import {
    Plane,
    Bell,
    ListRestart,
    Glasses,
    NotebookPen,
    MonitorX,
    Clock,
    CheckCircle
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

interface TasksSidebarProps {
    launchTradingPlan: () => void;
    launchApertura: () => void;
    launchUpdate: () => void;
    launchGestion: () => void;
    launchTradeLog: () => void;
    launchCierreDia: () => void;
    isProcessing: boolean;
    completedTasks: Set<string>;
    isTradeActive: boolean;
    isUpdateLimitReached?: boolean;
}

export function TasksSidebar({
    launchTradingPlan,
    launchApertura,
    launchUpdate,
    launchGestion,
    launchTradeLog,
    launchCierreDia,
    isProcessing,
    completedTasks,
    isTradeActive,
    isUpdateLimitReached = false
}: TasksSidebarProps) {
    const { tasks } = useTaskScheduler();
    const [time, setTime] = useState(new Date());

    // Real-time clock — updates every second
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Map task IDs to their launch functions
    const getAction = (id: string): (() => void) => {
        switch (id) {
            case 'planVuelo': return launchTradingPlan;
            case 'apertura': return launchApertura;
            case 'actualizacion': return launchUpdate;
            case 'gestionTrade': return launchGestion;
            case 'tradeLog': return launchTradeLog;
            case 'cierreDia': return launchCierreDia;
            default: return () => {};
        }
    };

    // Map task IDs to the new Lucide icons
    const getIcon = (id: string, size = 22) => {
        const props = { size, strokeWidth: 1.5 };
        switch (id) {
            case 'planVuelo': return <Plane {...props} />;
            case 'apertura': return <Bell {...props} />;
            case 'actualizacion': return <ListRestart {...props} />;
            case 'gestionTrade': return <Glasses {...props} />;
            case 'tradeLog': return <NotebookPen {...props} />;
            case 'cierreDia': return <MonitorX {...props} />;
            default: return <Clock {...props} />;
        }
    };

    return (
        <aside className="w-24 bg-[#0a0f1c]/90 backdrop-blur-xl border-l border-white/5 flex flex-col items-center py-6 h-full flex-shrink-0 relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">

            {/* ── HEADER: Title & Live Clock ── */}
            <div className="mb-5 flex flex-col items-center justify-center w-full px-2 gap-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-center leading-tight drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                    SIEBEN<br />TASKS
                </h3>
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5 w-full justify-center">
                    <Clock size={9} className="text-cyan-500 animate-pulse flex-shrink-0" />
                    <span className="text-[10px] text-gray-300 font-mono tracking-wider tabular-nums">
                        {time.toLocaleTimeString('es-MX', { hour12: false })}
                    </span>
                </div>
            </div>

            {/* Separator */}
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-5" />

            {/* ── TASK BUTTONS ── */}
            <div className="flex-1 flex flex-col gap-4 w-full items-center px-2">
                {tasks.map((task) => {
                    const isCompleted = completedTasks.has(task.id);

                    // Disable logic
                    let isDisabled = !task.isEnabled || isProcessing;
                    if (task.id === 'actualizacion' && isUpdateLimitReached) isDisabled = true;
                    if (isTradeActive && task.id !== 'gestionTrade' && task.id !== 'tradeLog') isDisabled = true;

                    // Label shown in tooltip
                    const tooltipLabel = (task.id === 'gestionTrade' && isTradeActive)
                        ? 'Actualizar Gestión'
                        : task.label;

                    // Button class
                    let btnClass = "group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ";
                    let iconClass = "";

                    if (isDisabled) {
                        btnClass += "bg-white/5 opacity-30 cursor-not-allowed";
                        iconClass = "text-slate-500";
                    } else if (isCompleted) {
                        btnClass += "bg-emerald-500/10 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30 cursor-pointer";
                        iconClass = "text-emerald-400";
                    } else {
                        btnClass += "bg-white/5 hover:bg-cyan-500/10 ring-1 ring-white/10 hover:ring-cyan-500/50 hover:-translate-y-0.5 cursor-pointer shadow-lg active:scale-95";
                        iconClass = "text-slate-300 group-hover:text-cyan-400 transition-colors";
                    }

                    return (
                        <button
                            key={task.id}
                            disabled={isDisabled}
                            onClick={() => getAction(task.id)()}
                            className={btnClass}
                            aria-label={tooltipLabel}
                        >
                            {/* Icon or Completed Checkmark */}
                            <span className={iconClass}>
                                {isCompleted
                                    ? <CheckCircle size={22} strokeWidth={1.5} />
                                    : getIcon(task.id)
                                }
                            </span>

                            {/* Completed dot indicator */}
                            {isCompleted && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                            )}

                            {/* Hover Tooltip — appears to the LEFT */}
                            <span className="absolute right-[110%] mr-2 origin-right scale-0 group-hover:scale-100 transition-transform bg-[#0d1526] text-white text-[10px] uppercase font-bold tracking-wider py-1.5 px-3 rounded whitespace-nowrap border border-cyan-500/20 shadow-xl z-50 pointer-events-none">
                                {tooltipLabel}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── FOOTER: Processing indicator ── */}
            <div className="mt-4 flex flex-col items-center gap-1">
                <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isProcessing
                            ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]'
                            : 'bg-cyan-500/30 border border-cyan-500/50'
                    }`}
                    title={isProcessing ? 'Processing' : 'Idle'}
                />
                <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                    {isProcessing ? 'PROC...' : 'IDLE'}
                </span>
            </div>

        </aside>
    );
}
