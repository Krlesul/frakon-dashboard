import type { DashboardIntelligenceContext, DashboardUrgencySeverity, DashboardUsageSignal } from './dashboard-intelligence';

export interface DashboardIntelligenceStabilizerOptions {
  urgencyConfirmMs?: number;
  urgencyReleaseMs?: number;
  minimumEmissionIntervalMs?: number;
}

interface UrgencyState {
  observed: boolean;
  observedSince: number;
  stable: boolean;
  severity: DashboardUrgencySeverity;
}

export type DashboardIntelligenceUrgencyPhase = 'stable' | 'confirming' | 'cooldown';

export interface DashboardIntelligenceUrgencyDiagnostic {
  itemId: string;
  observedUrgent: boolean;
  stableUrgent: boolean;
  severity: DashboardUrgencySeverity;
  phase: DashboardIntelligenceUrgencyPhase;
  nextEvaluationAt?: number;
}

export interface DashboardIntelligenceStabilizerResult {
  context: DashboardIntelligenceContext;
  changed: boolean;
  nextEvaluationAt?: number;
  diagnostics: DashboardIntelligenceUrgencyDiagnostic[];
}

export class DashboardIntelligenceStabilizer {
  private readonly urgencyConfirmMs: number;
  private readonly urgencyReleaseMs: number;
  private readonly minimumEmissionIntervalMs: number;
  private readonly urgency = new Map<string, UrgencyState>();
  private lastContext?: DashboardIntelligenceContext;
  private lastEmissionAt = Number.NEGATIVE_INFINITY;

  constructor(options: DashboardIntelligenceStabilizerOptions = {}) {
    this.urgencyConfirmMs = Math.max(0, options.urgencyConfirmMs ?? 5_000);
    this.urgencyReleaseMs = Math.max(0, options.urgencyReleaseMs ?? 15_000);
    this.minimumEmissionIntervalMs = Math.max(0, options.minimumEmissionIntervalMs ?? 2_000);
  }

  update(input: DashboardIntelligenceContext, now = input.now ?? Date.now()): DashboardIntelligenceStabilizerResult {
    const usage = (input.usage ?? []).map((signal) => this.stabilizeSignal(signal, now));
    this.removeMissingSignals(new Set(usage.map((signal) => signal.itemId)));
    const context: DashboardIntelligenceContext = { ...structuredClone(input), now, usage };
    const contentChanged = !sameContext(this.lastContext, context);
    const hasCriticalActivation = usage.some((signal) => signal.urgent && signal.severity === 'critical')
      && !(this.lastContext?.usage ?? []).some((signal) => signal.itemId === signal.itemId && signal.urgent && signal.severity === 'critical');
    const intervalElapsed = now - this.lastEmissionAt >= this.minimumEmissionIntervalMs;
    const changed = contentChanged && (intervalElapsed || hasCriticalActivation);

    if (changed) {
      this.lastContext = structuredClone(context);
      this.lastEmissionAt = now;
    }

    return {
      context: changed || !this.lastContext ? context : structuredClone(this.lastContext),
      changed,
      nextEvaluationAt: this.nextEvaluationAt(now),
      diagnostics: this.diagnostics(now),
    };
  }

  reset(): void {
    this.urgency.clear();
    this.lastContext = undefined;
    this.lastEmissionAt = Number.NEGATIVE_INFINITY;
  }

  private stabilizeSignal(signal: DashboardUsageSignal, now: number): DashboardUsageSignal {
    const observed = Boolean(signal.urgent);
    const severity = signal.severity ?? (observed ? 'warning' : 'normal');
    const current = this.urgency.get(signal.itemId);
    const state = current ?? { observed, observedSince: now, stable: false, severity };

    if (state.observed !== observed || state.severity !== severity) {
      state.observed = observed;
      state.observedSince = now;
      state.severity = severity;
    }

    if (observed && severity === 'critical') {
      state.stable = true;
    } else {
      const threshold = observed ? this.urgencyConfirmMs : this.urgencyReleaseMs;
      if (state.stable !== observed && now - state.observedSince >= threshold) state.stable = observed;
    }
    this.urgency.set(signal.itemId, state);
    return { ...signal, urgent: state.stable, severity: state.stable ? severity : 'normal' };
  }

  private removeMissingSignals(present: Set<string>): void {
    for (const itemId of this.urgency.keys()) if (!present.has(itemId)) this.urgency.delete(itemId);
  }

  private diagnostics(now: number): DashboardIntelligenceUrgencyDiagnostic[] {
    return [...this.urgency.entries()].map(([itemId, state]) => {
      const phase: DashboardIntelligenceUrgencyPhase = state.stable === state.observed ? 'stable' : state.observed ? 'confirming' : 'cooldown';
      const threshold = state.observed ? (state.severity === 'critical' ? 0 : this.urgencyConfirmMs) : this.urgencyReleaseMs;
      const nextEvaluationAt = phase === 'stable' ? undefined : state.observedSince + threshold;
      return { itemId, observedUrgent: state.observed, stableUrgent: state.stable, severity: state.severity, phase, nextEvaluationAt: nextEvaluationAt && nextEvaluationAt > now ? nextEvaluationAt : undefined };
    }).sort((left, right) => left.itemId.localeCompare(right.itemId));
  }

  private nextEvaluationAt(now: number): number | undefined {
    let next: number | undefined;
    for (const state of this.urgency.values()) {
      if (state.stable === state.observed) continue;
      const threshold = state.observed ? (state.severity === 'critical' ? 0 : this.urgencyConfirmMs) : this.urgencyReleaseMs;
      const candidate = state.observedSince + threshold;
      if (candidate <= now) continue;
      next = next === undefined ? candidate : Math.min(next, candidate);
    }
    if (this.lastContext && now - this.lastEmissionAt < this.minimumEmissionIntervalMs) {
      const candidate = this.lastEmissionAt + this.minimumEmissionIntervalMs;
      next = next === undefined ? candidate : Math.min(next, candidate);
    }
    return next;
  }
}

function sameContext(left: DashboardIntelligenceContext | undefined, right: DashboardIntelligenceContext): boolean {
  if (!left) return false;
  return JSON.stringify(normalizeContext(left)) === JSON.stringify(normalizeContext(right));
}

function normalizeContext(context: DashboardIntelligenceContext): DashboardIntelligenceContext {
  return { ...context, now: undefined, usage: [...(context.usage ?? [])].map((signal) => ({ ...signal })).sort((left, right) => left.itemId.localeCompare(right.itemId)) };
}
