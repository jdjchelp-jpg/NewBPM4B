export interface OperationProgress {
  operationId: string;
  task: string;
  stage: string;
  progress: number;
  detail?: string;
  timestamp: string;
}

export function createOperationId(prefix = 'operation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Send the same progress update to the browser UI and the Vite dev-server terminal. */
export function reportOperationProgress(update: Omit<OperationProgress, 'timestamp'>) {
  const event: OperationProgress = { ...update, progress: Math.max(0, Math.min(100, Math.round(update.progress))), timestamp: new Date().toISOString() };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bpm4b:operation-progress', { detail: event }));
  if ((import.meta as any).env?.DEV) {
    void fetch('/__bpm4b/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => { /* terminal reporting is optional if the dev server is restarting */ });
  }
}
