import type { DashboardIntelligenceContext } from './dashboard-intelligence';
import type { DashboardIntelligenceProposal } from './dashboard-intelligence-proposals';

export type DashboardIntelligenceApplicationMode = 'preview-only' | 'user-confirmed';

export interface DashboardIntelligenceApplicationDecision {
  allowed: boolean;
  requiresCriticalConfirmation: boolean;
  criticalItemIds: string[];
  reason: string;
}

export interface DashboardIntelligenceApplicationRequest {
  proposal?: DashboardIntelligenceProposal;
  context: DashboardIntelligenceContext;
  mode: DashboardIntelligenceApplicationMode;
  criticalConfirmed?: boolean;
}

export function evaluateDashboardIntelligenceApplication(
  request: DashboardIntelligenceApplicationRequest,
): DashboardIntelligenceApplicationDecision {
  const criticalItemIds = (request.context.usage ?? [])
    .filter((signal) => signal.urgent && signal.severity === 'critical')
    .map((signal) => signal.itemId)
    .sort();
  const requiresCriticalConfirmation = criticalItemIds.length > 0;

  if (!request.proposal) {
    return {
      allowed: false,
      requiresCriticalConfirmation,
      criticalItemIds,
      reason: 'No Dashboard Intelligence proposal is selected.',
    };
  }

  if (request.proposal.changedItemIds.length === 0) {
    return {
      allowed: false,
      requiresCriticalConfirmation,
      criticalItemIds,
      reason: 'The selected proposal does not change the dashboard.',
    };
  }

  if (request.mode !== 'user-confirmed') {
    return {
      allowed: false,
      requiresCriticalConfirmation,
      criticalItemIds,
      reason: 'Automatic signals may update previews but cannot modify the saved dashboard.',
    };
  }

  if (requiresCriticalConfirmation && !request.criticalConfirmed) {
    return {
      allowed: false,
      requiresCriticalConfirmation: true,
      criticalItemIds,
      reason: 'Critical automatic signals require a separate user confirmation before applying the layout.',
    };
  }

  return {
    allowed: true,
    requiresCriticalConfirmation,
    criticalItemIds,
    reason: 'The proposal was explicitly confirmed by the user.',
  };
}
