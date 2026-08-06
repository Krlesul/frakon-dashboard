import { describe, expect, it } from 'vitest';
import { DashboardIntelligenceStabilizer } from './dashboard-intelligence-stabilizer';
import type { DashboardIntelligenceContext, DashboardUrgencySeverity } from './dashboard-intelligence';

function context(urgent: boolean, now: number, severity: DashboardUrgencySeverity = urgent ? 'warning' : 'normal'): DashboardIntelligenceContext {
  return {
    device: 'wall',
    daypart: 'night',
    now,
    usage: [{ itemId: 'gate', interactions30d: 4, urgent, severity }],
  };
}

describe('DashboardIntelligenceStabilizer', () => {
  it('requires warning urgency to remain active before exposing it', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 5_000, minimumEmissionIntervalMs: 0 });
    expect(stabilizer.update(context(false, 0), 0).context.usage?.[0]?.urgent).toBe(false);
    const confirming = stabilizer.update(context(true, 1_000), 1_000);
    expect(confirming.context.usage?.[0]?.urgent).toBe(false);
    expect(confirming.diagnostics[0]).toMatchObject({ itemId: 'gate', phase: 'confirming', severity: 'warning' });
    expect(stabilizer.update(context(true, 6_000), 6_000).context.usage?.[0]?.urgent).toBe(true);
  });

  it('exposes critical urgency immediately and bypasses emission throttling', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 30_000, minimumEmissionIntervalMs: 10_000 });
    expect(stabilizer.update(context(false, 0), 0).changed).toBe(true);
    const result = stabilizer.update(context(true, 500, 'critical'), 500);
    expect(result.changed).toBe(true);
    expect(result.context.usage?.[0]).toMatchObject({ urgent: true, severity: 'critical' });
    expect(result.diagnostics[0]).toMatchObject({ phase: 'stable', severity: 'critical', stableUrgent: true });
  });

  it('keeps urgency active during the release cooldown', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, urgencyReleaseMs: 10_000, minimumEmissionIntervalMs: 0 });
    expect(stabilizer.update(context(true, 0), 0).context.usage?.[0]?.urgent).toBe(true);
    const cooling = stabilizer.update(context(false, 1_000), 1_000);
    expect(cooling.context.usage?.[0]?.urgent).toBe(true);
    expect(cooling.diagnostics[0]).toMatchObject({ phase: 'cooldown', observedUrgent: false, stableUrgent: true });
    expect(stabilizer.update(context(false, 11_000), 11_000).context.usage?.[0]?.urgent).toBe(false);
  });

  it('limits non-critical context emissions', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, minimumEmissionIntervalMs: 2_000 });
    expect(stabilizer.update(context(false, 0), 0).changed).toBe(true);
    const suppressed = stabilizer.update({ ...context(false, 500), device: 'tablet' }, 500);
    expect(suppressed.changed).toBe(false);
    expect(suppressed.context.device).toBe('wall');
    expect(stabilizer.update({ ...context(false, 2_000), device: 'tablet' }, 2_000).changed).toBe(true);
  });

  it('removes diagnostics for cards no longer present', () => {
    const stabilizer = new DashboardIntelligenceStabilizer({ urgencyConfirmMs: 0, minimumEmissionIntervalMs: 0 });
    stabilizer.update(context(true, 0), 0);
    const result = stabilizer.update({ device: 'wall', daypart: 'night', now: 1, usage: [] }, 1);
    expect(result.diagnostics).toEqual([]);
  });
});
