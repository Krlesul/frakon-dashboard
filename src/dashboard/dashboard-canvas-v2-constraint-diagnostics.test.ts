import { describe, expect, it } from 'vitest';
import { summarizeDashboardCanvasV2ConstraintDiagnostics } from './dashboard-canvas-v2-constraint-diagnostics';

describe('summarizeDashboardCanvasV2ConstraintDiagnostics', () => {
  it('reports a clean applied set as ok', () => {
    const summary = summarizeDashboardCanvasV2ConstraintDiagnostics([
      { constraintId: 'a', status: 'applied', message: 'applied' },
      { constraintId: 'b', status: 'applied', message: 'applied' },
    ]);
    expect(summary).toMatchObject({ total: 2, applied: 2, locked: 0, missing: 0, severity: 'ok' });
    expect(summary.issues).toEqual([]);
  });

  it('treats locked and skipped constraints as warnings', () => {
    const summary = summarizeDashboardCanvasV2ConstraintDiagnostics([
      { constraintId: 'a', status: 'locked', message: 'locked' },
      { constraintId: 'b', status: 'skipped', message: 'skipped' },
    ]);
    expect(summary).toMatchObject({ locked: 1, skipped: 1, severity: 'warning' });
    expect(summary.issues).toHaveLength(2);
  });

  it('treats missing references as errors', () => {
    const summary = summarizeDashboardCanvasV2ConstraintDiagnostics([
      { constraintId: 'broken', status: 'missing-item', message: 'missing' },
    ]);
    expect(summary.severity).toBe('error');
    expect(summary.missing).toBe(1);
  });
});
