import React from 'react';
import { Plane, Bell, ListRestart, Glasses, NotebookPen, MonitorX, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

// --- STUB PROPS FOR PREVIEW ---
const mockProps = {
    isProcessing: false,
    completedTasks: new Set(['planVuelo']),
    isTradeActive: false,
    isUpdateLimitReached: false,
    launchTradingPlan: () => console.log('launchTradingPlan'),
    launchApertura: () => console.log('launchApertura'),
    launchUpdate: () => console.log('launchUpdate'),
    launchGestion: () => console.log('launchGestion'),
    launchTradeLog: () => console.log('launchTradeLog'),
    launchCierreDia: () => console.log('launchCierreDia')
};

function TasksSidebar_Proposal1(props: any) {
    const { isProcessing, completedTasks, isTradeActive, isUpdateLimitReached } = props;
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const tasksConfig = [
        { id: 'planVuelo', icon: Plane, label: 'Plan de Vuelo', action: props.launchTradingPlan },
        { id: 'apertura', icon: Bell, label: 'Apertura', action: props.launchApertura },
        { id: 'actualizacion', icon: ListRestart, label: 'Actualización', action: props.launchUpdate, isLimited: isUpdateLimitReached },
        { id: 'gestionTrade', icon: Glasses, label: 'Trade Activo', action: props.launchGestion, showUpdate: isTradeActive },
        { id: 'tradeLog', icon: NotebookPen, label: 'Registro de Trade', action: props.launchTradeLog },
        { id: 'cierreDia', icon: MonitorX, label: 'Cierre del Día', action: props.launchCierreDia }
    ];

    return (
        <aside className="w-20 bg-operator-bg border-l border-operator-border flex flex-col items-center py-6 h-full flex-shrink-0 z-10 relative">
            <div className="flex flex-col items-center mb-8 gap-4 w-full">
                <div className="text-sieben font-bold text-xs uppercase tracking-[0.2em] transform -rotate-90 whitespace-nowrap mb-12 shadow-sieben overflow-visible">
                    SIEBEN TASKS
                </div>
                <div className="text-[10px] text-operator-text font-mono tracking-tighter bg-operator-card px-2 py-1 rounded-sm border border-operator-border shadow-inner">
                    {time.toLocaleTimeString('es-MX', { hour12: false })}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 w-full px-3">
                {tasksConfig.map((task) => {
                    const isCompleted = completedTasks.has(task.id);
                    let isDisabled = isProcessing || (task.isLimited);
                    if (isTradeActive && task.id !== 'gestionTrade' && task.id !== 'tradeLog') isDisabled = true;
                    const IconSelected = task.icon;
                    let btnClass = "relative group flex items-center justify-center w-14 h-14 rounded-xl border transition-all duration-300 ";
                    let iconColor = "text-operator-muted";
                    
                    if (isDisabled) {
                        btnClass += "bg-operator-bg border-operator-border/50 opacity-40 cursor-not-allowed grayscale";
                    } else if (isCompleted) {
                        btnClass += "bg-emerald-900/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                        iconColor = "text-emerald-500";
                    } else {
                        btnClass += "bg-operator-card border-operator-border cursor-pointer hover:bg-sieben/10 hover:border-sieben hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]";
                        iconColor = "text-operator-text group-hover:text-sieben transition-colors";
                    }

                    return (
                        <button key={task.id} disabled={isDisabled} onClick={() => { setActiveTaskId(task.id); task.action(); }} className={btnClass}>
                            <IconSelected size={22} className={iconColor} strokeWidth={1.5} />
                            {isCompleted && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />}
                            {(!isDisabled && !isCompleted && activeTaskId === task.id) && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sieben shadow-[0_0_5px_#38bdf8]" />}
                            <div className="absolute left-[-120px] top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-operator-card border border-operator-border rounded-md text-[10px] text-operator-text font-mono opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity uppercase tracking-widest whitespace-nowrap z-50 shadow-xl">
                                {task.label}
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className={`mt-auto w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]' : 'border-2 border-operator-muted'}`} title={isProcessing ? 'Processing' : 'Idle'} />
        </aside>
    );
}

function TasksSidebar_Proposal2(props: any) {
    const { isProcessing, completedTasks, isTradeActive, isUpdateLimitReached } = props;
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const tasksConfig = [
        { id: 'planVuelo', icon: Plane, label: 'Plan de Vuelo', action: props.launchTradingPlan },
        { id: 'apertura', icon: Bell, label: 'Apertura', action: props.launchApertura },
        { id: 'actualizacion', icon: ListRestart, label: 'Actualización', action: props.launchUpdate, isLimited: isUpdateLimitReached },
        { id: 'gestionTrade', icon: Glasses, label: 'Trade Activo', action: props.launchGestion, showUpdate: isTradeActive },
        { id: 'tradeLog', icon: NotebookPen, label: 'Registro de Trade', action: props.launchTradeLog },
        { id: 'cierreDia', icon: MonitorX, label: 'Cierre del Día', action: props.launchCierreDia }
    ];

    return (
        <aside className="w-24 bg-[#0a0f1c]/80 backdrop-blur-xl border-l border-white/5 flex flex-col items-center py-6 h-full flex-shrink-0 relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="mb-6 flex flex-col items-center justify-center w-full px-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-center leading-tight mb-2 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                    SIEBEN<br/>TASKS
                </h3>
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/5 w-full justify-center">
                    <Clock size={10} className="text-cyan-500 animate-pulse" />
                    <span className="text-[10px] text-gray-300 font-mono tracking-wider">
                        {time.toLocaleTimeString('es-MX', { hour12: false })}
                    </span>
                </div>
            </div>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-6" />
            <div className="flex-1 flex flex-col gap-5 w-full items-center">
                {tasksConfig.map((task) => {
                    const isCompleted = completedTasks.has(task.id);
                    let isDisabled = isProcessing || (task.isLimited);
                    if (isTradeActive && task.id !== 'gestionTrade' && task.id !== 'tradeLog') isDisabled = true;
                    const Icon = task.icon;
                    let btnClass = "group relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ";
                    let iconColor = "text-slate-400";

                    if (isDisabled) {
                        btnClass += "bg-white/5 opacity-30 cursor-not-allowed";
                    } else if (isCompleted) {
                        btnClass += "bg-emerald-500/10 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30";
                        iconColor = "text-emerald-400";
                    } else {
                        btnClass += "bg-white/5 hover:bg-cyan-500/10 ring-1 ring-white/10 hover:ring-cyan-500/50 hover:-translate-y-1 cursor-pointer shadow-lg";
                        iconColor = "text-slate-300 group-hover:text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]";
                    }

                    return (
                        <button key={task.id} disabled={isDisabled} onClick={() => task.action()} className={btnClass}>
                            <Icon size={24} strokeWidth={1.5} className={`${iconColor} transition-colors`} />
                            <span className="absolute right-[110%] mr-2 scale-0 group-hover:scale-100 transition-transform origin-right bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider py-1.5 px-3 rounded whitespace-nowrap border border-slate-700 shadow-xl z-50">
                                {task.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}

export function SidebarPlayground() {
    return (
        <div className="min-h-screen bg-operator-bg text-operator-text flex flex-col p-8 font-sans">
            <h1 className="text-2xl font-bold mb-2">UI Playground: Barra Lateral Derecha</h1>
            <p className="text-operator-muted mb-8">Ambas barras laterales corren versiones funcionales del reloj y tooltips.</p>
            
            <div className="flex gap-20 h-[800px] border border-operator-border p-8 rounded-xl bg-black">
                
                {/* Visualizer Prop 1 */}
                <div className="flex flex-col h-full border border-operator-border border-dashed shadow-2xl relative">
                    <div className="absolute -top-8 left-0 text-sieben text-xs font-bold font-mono">1. "The Command Dock" (w-20)</div>
                    <TasksSidebar_Proposal1 {...mockProps} />
                </div>

                {/* Visualizer Prop 2 */}
                <div className="flex flex-col h-full border border-operator-border border-dashed shadow-2xl relative">
                    <div className="absolute -top-8 left-0 text-cyan-400 text-xs font-bold font-mono">2. "Glass Console" (w-24)</div>
                    <TasksSidebar_Proposal2 {...mockProps} />
                </div>

            </div>
        </div>
    );
}
