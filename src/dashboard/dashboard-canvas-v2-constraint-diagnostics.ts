import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';

export type DashboardConstraintDiagnosticSeverity = 'ok' | 'warning' | 'error';

export interface DashboardCanvasV2ConstraintDiagnosticsSummary {
  total: number;
  applied: number;
  skipped: number;
  locked: number;
  missing: number;
  severity: DashboardConstraintDiagnosticSeverity;
  issues: ConstraintDiagnostic[];
}

export function summarizeDashboardCanvasV2ConstraintDiagnostics(
  diagnostics: ConstraintDiagnostic[],
): DashboardCanvasV2ConstraintDiagnosticsSummary {
  const applied = diagnostics.filter((item) => item.status === 'applied').length;
  const skipped = diagnostics.filter((item) => item.status === 'skipped').length;
  const locked = diagnostics.filter((item) => item.status === 'locked').length;
  const missing = diagnostics.filter((item) => item.status === 'missing-item').length;
  const issues = diagnostics.filter((item) => item.status !== 'applied');
  const severity: DashboardConstraintDiagnosticSeverity = missing > 0
    ? 'error'
    : locked > 0 || skipped > 0
      ? 'warning'
      : 'ok';

  return {
    total: diagnostics.length,
    applied,
    skipped,
    locked,
    missing,
    severity,
    issues: issues.map((item) => ({ ...item })),
  };
}
