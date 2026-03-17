import { useState, useEffect } from 'react';

export const useUpdateLimit = (limit: number = 100, timeWindowMs: number = 3600000) => {
    const [updateCount, setUpdateCount] = useState(0);
    const [firstUpdateTimestamp, setFirstUpdateTimestamp] = useState<number | null>(null);

    useEffect(() => {
        if (!firstUpdateTimestamp) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - firstUpdateTimestamp > timeWindowMs) {
                console.log("🔄 Update limit reset (1 hour passed)");
                setUpdateCount(0);
                setFirstUpdateTimestamp(null);
            }
        }, 5000); // Check every 5s

        return () => clearInterval(interval);
    }, [firstUpdateTimestamp, timeWindowMs]);

    const registerUpdate = () => {
        const now = Date.now();
        if (updateCount === 0 || !firstUpdateTimestamp) {
            setFirstUpdateTimestamp(now);
        }
        setUpdateCount(prev => prev + 1);
    };

    const canUpdate = updateCount < limit;

    return { canUpdate, registerUpdate, updateCount };
};
