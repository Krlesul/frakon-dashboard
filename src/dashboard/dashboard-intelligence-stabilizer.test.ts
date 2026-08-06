import { describe, expect, it } from 'vitest';
import { DashboardIntelligenceStabilizer } from './dashboard-intelligence-stabilizer';
import type { DashboardIntelligenceContext } from './dashboard-intelligence';

function context(urgent: boolean, now: number): DashboardIntelligenceContext {
  return {
    device: 'wall',
    daypart: 'night',
    now,
    usage: [{ itemId: 'gate', interactions30d: 4, urgent }],
  };
}

describe('DashboardIntelligenceStabilizer', () => {
  it('requires urgency to remain active before exposing it', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 5_000, minimumEmissionIntervalMs: 0 });

    expect(stabilizer.update(context(false, 0), 0).context.usage?.[0]?.urgent).toBe(false);
    const confirming = stabilizer.update(context(true, 1_000), 1_000);
    expect(confirming.context.usage?.[0]?.urgent).toBe(false);
    expect(confirming.diagnostics[0]).toMatchObject({ itemId: 'gate', phase: 'confirming', observedUrgent: true, stableUrgent: false });
    expect(confirming.diagnostics[0]?.nextEvaluationAt).toBe(6_000);
    expect(stabilizer.update(context(true, 5_999), 5_999).context.usage?.[0]?.urgent).toBe(false);
    const confirmed = stabilizer.update(context(true, 6_000), 6_000);
    expect(confirmed.context.usage?.[0]?.urgent).toBe(true);
    expect(confirmed.diagnostics[0]).toMatchObject({ phase: 'stable', observedUrgent: true, stableUrgent: true });
  });

  it('keeps urgency active during the release cooldown', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, urgencyReleaseMs: 10_000, minimumEmissionIntervalMs: 0 });

    expect(stabilizer.update(context(true, 0), 0).context.usage?.[0]?.urgent).toBe(true);
    const cooling = stabilizer.update(context(false, 1_000), 1_000);
    expect(cooling.context.usage?.[0]?.urgent).toBe(true);
    expect(cooling.diagnostics[0]).toMatchObject({ phase: 'cooldown', observedUrgent: false, stableUrgent: true });
    expect(cooling.diagnostics[0]?.nextEvaluationAt).toBe(11_000);
    expect(stabilizer.update(context(false, 10_999), 10_999).context.usage?.[0]?.urgent).toBe(true);
    const released = stabilizer.update(context(false, 11_000), 11_000);
    expect(released.context.usage?.[0]?.urgent).toBe(false);
    expect(released.diagnostics[0]).toMatchObject({ phase: 'stable', observedUrgent: false, stableUrgent: false });
  });

  it('limits context emissions while preserving the latest stable context', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, minimumEmissionIntervalMs: 2_000 });

    expect(stabilizer.update(context(false, 0), 0).changed).toBe(true);
    const suppressed = stabilizer.update({ ...context(false, 500), device: 'tablet' }, 500);
    expect(suppressed.changed).toBe(false);
    expect(suppressed.context.device).toBe('wall');

    const emitted = stabilizer.update({ ...context(false, 2_000), device: 'tablet' }, 2_000);
    expect(emitted.changed).toBe(true);
    expect(emitted.context.device).toBe('tablet');
  });

  it('removes diagnostics for cards no longer present', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, minimumEmissionIntervalMs: 0 });
    stabilizer.update(context(true, 0), 0);
    const result = stabilizer.update({ device: 'wall', daypart: 'night', now: 1, usage: [] }, 1);
    expect(result.diagnostics).toEqual([]);
  });
});
