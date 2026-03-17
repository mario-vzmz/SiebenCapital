import { useState, useEffect } from 'react';

// Timezone-aware date helper (America/Mexico_City strictly)
const getMexicoCityTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
};

type TaskId = 'planVuelo' | 'apertura' | 'actualizacion' | 'gestionTrade' | 'tradeLog' | 'cierreDia';

export interface TaskStatus {
    id: TaskId;
    label: string;
    isEnabled: boolean;
    nextRunTime?: string;
    mode: 'manual' | 'auto';
}

export function useTaskScheduler() {
    const [tasks, setTasks] = useState<TaskStatus[]>([]);
    const [currentTime, setCurrentTime] = useState(getMexicoCityTime());
    const [hasRun730, setHasRun730] = useState(false);
    const [hasRun755, setHasRun755] = useState(false);
    const [hasRun830, setHasRun830] = useState(false); // Retenido por si hay aperturas RTH
    const [hasRun1600, setHasRun1600] = useState(false);

    // Update time every minute to re-evaluate task availability
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getMexicoCityTime());
        }, 60000); // Check every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const timeValue = hours * 100 + minutes; // Ex: 9:30 AM -> 930

        // LOGIC: Task Availability based on Market Hours (Mexico City Time)
        // 08:30 AM - Plan de Vuelo (Pre-Market)
        // 09:00 AM - Apertura (RTH Open)
        // 09:30 AM - Initial Balance (IB)
        // 10:00 AM+ - Actualización / Gestión / Logs
        // 15:00 PM - Cierre

        const now = currentTime; // Use currentTime from state
        // 07:30 AM - Plan de Vuelo (Pre-Market)
        if (now.getHours() === 7 && now.getMinutes() === 30 && now.getSeconds() === 0 && !hasRun730) {
            console.log('Ejecutando Plan de Vuelo (07:30)');
            // runPreMarketRoutine(); // Assuming this function exists elsewhere or is a placeholder
            setHasRun730(true);
        }

        // 07:55 AM - Apertura Macro Vector (Cierre Vela 25min)
        if (now.getHours() === 7 && now.getMinutes() === 55 && now.getSeconds() === 0 && !hasRun755) {
            console.log('Ejecutando Apertura Macro Vector (07:55)');
            // runAperturaMacroVectorRoutine(); // Assuming this function exists elsewhere or is a placeholder
            setHasRun755(true);
        }

        const updatedTasks: TaskStatus[] = [
            {
                id: 'planVuelo',
                label: 'Plan de Vuelo (Pre-Market)',
                isEnabled: true, // Always available for prep, technically ideally before 8:30
                mode: 'manual'
            },
            {
                id: 'apertura',
                label: 'Apertura (07:55)',
                isEnabled: true, // Bypass para testing
                mode: 'manual'
            },
            {
                id: 'actualizacion',
                label: 'Actualización Estructural',
                isEnabled: true, // Bypass para testing
                mode: 'manual'
            },
            {
                id: 'gestionTrade',
                label: 'Gestión de Trade Activo',
                isEnabled: true, // Bypass para testing
                mode: 'manual'
            },
            {
                id: 'tradeLog',
                label: 'Registrar Trade (Log)',
                isEnabled: true, // Bypass para testing
                mode: 'manual'
            },
            {
                id: 'cierreDia',
                label: 'Cierre de Sesión (15:00)',
                isEnabled: true, // Bypass para testing
                mode: 'manual'
            }
        ];

        setTasks(updatedTasks);
    }, [currentTime]);

    return { tasks, currentTime };
}
