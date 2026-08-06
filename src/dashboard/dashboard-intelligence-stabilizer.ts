import type { DashboardIntelligenceContext, DashboardUsageSignal } from './dashboard-intelligence';

export interface DashboardIntelligenceStabilizerOptions {
  urgencyConfirmMs?: number;
  urgencyReleaseMs?: number;
  minimumEmissionIntervalMs?: number;
}

interface UrgencyState {
  observed: boolean;
  observedSince: number;
  stable: boolean;
}

export interface DashboardIntelligenceStabilizerResult {
  context: DashboardIntelligenceContext;
  changed: boolean;
  nextEvaluationAt?: number;
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
    const context: DashboardIntelligenceContext = {
      ...structuredClone(input),
      now,
      usage,
    };
    const contentChanged = !sameContext(this.lastContext, context);
    const intervalElapsed = now - this.lastEmissionAt >= this.minimumEmissionIntervalMs;
    const changed = contentChanged && intervalElapsed;

    if (changed) {
      this.lastContext = structuredClone(context);
      this.lastEmissionAt = now;
    }

    return {
      context: changed || !this.lastContext ? context : structuredClone(this.lastContext),
      changed,
      nextEvaluationAt: this.nextEvaluationAt(now),
    };
  }

  reset(): void {
    this.urgency.clear();
    this.lastContext = undefined;
    this.lastEmissionAt = Number.NEGATIVE_INFINITY;
  }

  private stabilizeSignal(signal: DashboardUsageSignal, now: number): DashboardUsageSignal {
    const observed = Boolean(signal.urgent);
    const current = this.urgency.get(signal.itemId);
    const state = current ?? { observed, observedSince: now, stable: false };

    if (state.observed !== observed) {
      state.observed = observed;
      state.observedSince = now;
    }

    const threshold = observed ? this.urgencyConfirmMs : this.urgencyReleaseMs;
    if (state.stable !== observed && now - state.observedSince >= threshold) state.stable = observed;
    this.urgency.set(signal.itemId, state);

    return { ...signal, urgent: state.stable };
  }

  private nextEvaluationAt(now: number): number | undefined {
    let next: number | undefined;
    for (const state of this.urgency.values()) {
      if (state.stable === state.observed) continue;
      const candidate = state.observedSince + (state.observed ? this.urgencyConfirmMs : this.urgencyReleaseMs);
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
  return JSON.stringify({ ...left, now: undefined }) === JSON.stringify({ ...right, now: undefined });
}
