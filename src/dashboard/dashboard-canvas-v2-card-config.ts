import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2CardConfigPatchResult {
  status: 'committed' | 'unchanged' | 'missing-item' | 'invalid';
  document: FrakonDashboardDocumentV2;
  reason?: string;
}

const SAFE_KEYS = new Set(['entity', 'name', 'title']);

export function patchDashboardCanvasV2CardConfig(
  document: FrakonDashboardDocumentV2,
  itemId: string,
  patch: Record<string, unknown>,
): DashboardCanvasV2CardConfigPatchResult {
  const item = document.items.find((entry) => entry.id === itemId);
  if (!item) return { status: 'missing-item', document: structuredClone(document), reason: `Unknown item ${itemId}.` };
  const keys = Object.keys(patch);
  if (!keys.length || keys.some((key) => !SAFE_KEYS.has(key))) {
    return { status: 'invalid', document: structuredClone(document), reason: 'Card config patch contains unsupported fields.' };
  }
  const card = { ...item.card };
  for (const key of keys) {
    const value = patch[key];
    if (value === undefined || value === null || value === '') delete card[key];
    else if (typeof value === 'string') card[key] = value.trim();
    else return { status: 'invalid', document: structuredClone(document), reason: `${key} must be a string.` };
  }
  const next = normalizeDashboardV2({
    ...document,
    items: document.items.map((entry) => entry.id === itemId ? { ...structuredClone(entry), card } : structuredClone(entry)),
  });
  return {
    status: JSON.stringify(next) === JSON.stringify(document) ? 'unchanged' : 'committed',
    document: next,
  };
}
