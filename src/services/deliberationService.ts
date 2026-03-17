export interface DeliberationPayload {
    id?: string;
    taskId: string;
    timestamp?: string;
    input: string;
    output: string;
    agents: string[];
    status: string;
}

export async function saveDeliberation(payload: DeliberationPayload): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/deliberations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error(`Error saving deliberation: ${res.statusText}`);
    }
    return await res.json();
}

export async function getDeliberations(taskId?: string): Promise<DeliberationPayload[]> {
    const url = taskId
        ? `/api/deliberations?taskId=${taskId}`
        : '/api/deliberations';

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Error fetching deliberations: ${res.statusText}`);
    }
    return await res.json();
}

export async function saveTradeLog(tradeData: any): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
    });
    if (!res.ok) {
        throw new Error(`Error saving trade log: ${res.statusText}`);
    }
    return await res.json();
}
