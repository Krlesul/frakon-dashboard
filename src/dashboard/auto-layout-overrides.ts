import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardAutoLayoutOverrides {
  priority?: number | null;
  semanticGroup?: string | null;
}

export interface DashboardAutoLayoutOverrideResult {
  status: 'committed' | 'unchanged';
  document: FrakonDashboardDocument;
}

export function setDashboardAutoLayoutOverrides(
  document: FrakonDashboardDocument,
  itemId: string,
  overrides: DashboardAutoLayoutOverrides,
): DashboardAutoLayoutOverrideResult {
  const target = document.items.find((item) => item.id === itemId);
  if (!target) return { status: 'unchanged', document: structuredClone(document) };

  const card = structuredClone(target.card);
  if ('priority' in overrides) {
    if (overrides.priority === null || overrides.priority === undefined || !Number.isFinite(overrides.priority)) {
      delete card.priority;
    } else {
      card.priority = Math.max(0, Math.min(100, Math.round(overrides.priority)));
    }
  }
  if ('semanticGroup' in overrides) {
    const group = overrides.semanticGroup?.trim();
    if (group) card.layout_group = group;
    else delete card.layout_group;
  }

  if (JSON.stringify(card) === JSON.stringify(target.card)) {
    return { status: 'unchanged', document: structuredClone(document) };
  }

  return {
    status: 'committed',
    document: {
      ...document,
      items: document.items.map((item) => item.id === itemId ? { ...item, card } : structuredClone(item)),
    },
  };
}
