import { describe, expect, it } from 'vitest';
import { evaluateDashboardIntelligenceApplication } from './dashboard-intelligence-application-policy';
import type { DashboardIntelligenceProposal } from './dashboard-intelligence-proposals';

const proposal: DashboardIntelligenceProposal = {
  profile: 'focus',
  label: 'Focus',
  explanation: 'Test proposal',
  document: {
    version: 1,
    id: 'test',
    title: 'Test',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 72,
    gap: 12,
    items: [],
  },
  changedItemIds: ['gate'],
};

describe('evaluateDashboardIntelligenceApplication', () => {
  it('never allows preview-only automatic changes to modify the dashboard', () => {
    const decision = evaluateDashboardIntelligenceApplication({
      proposal,
      context: { device: 'wall', usage: [{ itemId: 'gate', urgent: true, severity: 'warning' }] },
      mode: 'preview-only',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('cannot modify');
  });

  it('requires separate confirmation when a critical signal is active', () => {
    const blocked = evaluateDashboardIntelligenceApplication({
      proposal,
      context: { device: 'wall', usage: [{ itemId: 'smoke', urgent: true, severity: 'critical' }] },
      mode: 'user-confirmed',
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.requiresCriticalConfirmation).toBe(true);
    expect(blocked.criticalItemIds).toEqual(['smoke']);

    const allowed = evaluateDashboardIntelligenceApplication({
      proposal,
      context: { device: 'wall', usage: [{ itemId: 'smoke', urgent: true, severity: 'critical' }] },
      mode: 'user-confirmed',
      criticalConfirmed: true,
    });
    expect(allowed.allowed).toBe(true);
  });

  it('allows a noncritical proposal only after an explicit user action', () => {
    const decision = evaluateDashboardIntelligenceApplication({
      proposal,
      context: { device: 'tablet', usage: [{ itemId: 'gate', urgent: true, severity: 'warning' }] },
      mode: 'user-confirmed',
    });
    expect(decision.allowed).toBe(true);
  });
});
