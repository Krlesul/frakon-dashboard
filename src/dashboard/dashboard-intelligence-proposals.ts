import { generateAutoLayoutProposal, type AutoLayoutStrategy } from '../../packages/studio-engine/src/auto-layout';
import { analyzeDashboardIntelligence, type DashboardIntelligenceContext } from './dashboard-intelligence';
import { normalizeAndCompactDashboard, type FrakonDashboardDocument } from './layout-model';

export type DashboardIntelligenceProfile = 'focus' | 'balanced' | 'compact' | 'wall-display';

export interface DashboardIntelligenceProposal {
  profile: DashboardIntelligenceProfile;
  label: string;
  explanation: string;
  document: FrakonDashboardDocument;
  changedItemIds: string[];
}

const PROFILE_CONFIG: Record<DashboardIntelligenceProfile, {
  strategy: AutoLayoutStrategy;
  label: string;
  explanation: string;
}> = {
  focus: {
    strategy: 'focus',
    label: 'Focus',
    explanation: 'Makes the highest-priority card dominant and keeps the next most important cards close.',
  },
  balanced: {
    strategy: 'balanced',
    label: 'Balanced',
    explanation: 'Balances card size, density and priority for everyday use.',
  },
  compact: {
    strategy: 'compact',
    label: 'Compact',
    explanation: 'Reduces card size to fit more information into the visible area.',
  },
  'wall-display': {
    strategy: 'priority-first',
    label: 'Wall display',
    explanation: 'Prioritizes monitoring cards and larger readable surfaces for a fixed display.',
  },
};

export function generateDashboardIntelligenceProposals(
  document: FrakonDashboardDocument,
  context: DashboardIntelligenceContext,
  profiles: DashboardIntelligenceProfile[] = ['focus', 'balanced', 'compact', 'wall-display'],
): DashboardIntelligenceProposal[] {
  const analysis = analyzeDashboardIntelligence(document, context);
  const byId = new Map(analysis.scores.map((score) => [score.itemId, score]));

  return profiles.map((profile, index) => {
    const config = PROFILE_CONFIG[profile];
    const proposal = generateAutoLayoutProposal(
      document.items.map((item) => {
        const score = byId.get(item.id);
        return {
          id: item.id,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          locked: item.locked,
          priority: score?.score,
          preferredWidth: score?.recommendedWidth,
          preferredHeight: score?.recommendedHeight,
          minWidth: item.minW,
          minHeight: item.minH,
          maxWidth: item.maxW,
          maxHeight: item.maxH,
        };
      }),
      { columns: document.columns, strategy: config.strategy, variant: index },
    );
    const layoutById = new Map(proposal.items.map((item) => [item.id, item]));
    const next = normalizeAndCompactDashboard({
      ...structuredClone(document),
      items: document.items.map((item) => {
        const layout = layoutById.get(item.id);
        return layout ? { ...item, x: layout.x, y: layout.y, w: layout.w, h: layout.h } : item;
      }),
    });

    return {
      profile,
      label: config.label,
      explanation: config.explanation,
      document: next,
      changedItemIds: document.items
        .filter((item) => {
          const changed = next.items.find((candidate) => candidate.id === item.id);
          return changed && (changed.x !== item.x || changed.y !== item.y || changed.w !== item.w || changed.h !== item.h);
        })
        .map((item) => item.id),
    };
  });
}
