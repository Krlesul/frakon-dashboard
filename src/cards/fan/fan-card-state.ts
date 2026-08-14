export interface FrakonFanState {
  on: boolean;
  unavailable: boolean;
  percentage?: number;
}

export function frakonFanState(state: string, percentage: unknown): FrakonFanState {
  const unavailable = state === 'unavailable' || state === 'unknown';
  const parsed = typeof percentage === 'number' && Number.isFinite(percentage)
    ? Math.max(0, Math.min(100, percentage))
    : undefined;
  return {
    on: state === 'on',
    unavailable,
    percentage: parsed,
  };
}

export function normalizeFanPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
