import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

export interface DashboardLayerResult {
  status: 'committed' | 'unchanged' | 'invalid';
  document: FrakonDashboardDocument;
  reason?: string;
}

function result(
  document: FrakonDashboardDocument,
  status: DashboardLayerResult['status'],
  reason?: string,
): DashboardLayerResult {
  return { status, document: normalizeDashboard(structuredClone(document)), reason };
}

export function renameDashboardLayer(
  document: FrakonDashboardDocument,
  id: string,
  name: string,
): DashboardLayerResult {
  const index = document.items.findIndex((item) => item.id === id);
  if (index < 0) return result(document, 'invalid', 'Dashboard layer was not found.');
  const trimmed = name.trim();
  const current = typeof document.items[index].card.name === 'string'
    ? document.items[index].card.name.trim()
    : '';
  if (current === trimmed) return result(document, 'unchanged');

  const items = document.items.map((item) => {
    if (item.id !== id) return structuredClone(item);
    const card = structuredClone(item.card);
    if (trimmed) card.name = trimmed;
    else delete card.name;
    return { ...structuredClone(item), card };
  });
  return result({ ...document, items }, 'committed');
}

export function setDashboardLayerLocked(
  document: FrakonDashboardDocument,
  id: string,
  locked: boolean,
): DashboardLayerResult {
  const target = document.items.find((item) => item.id === id);
  if (!target) return result(document, 'invalid', 'Dashboard layer was not found.');
  if (Boolean(target.locked) === locked) return result(document, 'unchanged');
  return result({
    ...document,
    items: document.items.map((item) => item.id === id ? { ...structuredClone(item), locked } : structuredClone(item)),
  }, 'committed');
}

export function setDashboardLayerHidden(
  document: FrakonDashboardDocument,
  id: string,
  hidden: boolean,
): DashboardLayerResult {
  const target = document.items.find((item) => item.id === id);
  if (!target) return result(document, 'invalid', 'Dashboard layer was not found.');
  if (Boolean(target.hidden) === hidden) return result(document, 'unchanged');
  return result({
    ...document,
    items: document.items.map((item) => item.id === id ? { ...structuredClone(item), hidden } : structuredClone(item)),
  }, 'committed');
}

/**
 * Move `sourceId` immediately above `targetId` in visual z-order.
 * `items[]` is ordered back-to-front, so "above" means immediately after target.
 */
export function moveDashboardLayerAbove(
  document: FrakonDashboardDocument,
  sourceId: string,
  targetId: string,
): DashboardLayerResult {
  if (sourceId === targetId) return result(document, 'unchanged');
  const source = document.items.find((item) => item.id === sourceId);
  const target = document.items.find((item) => item.id === targetId);
  if (!source || !target) return result(document, 'invalid', 'Dashboard layer was not found.');
  if (source.locked) return result(document, 'invalid', 'Locked layers cannot be reordered.');

  const items = document.items.filter((item) => item.id !== sourceId).map((item) => structuredClone(item));
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return result(document, 'invalid', 'Target dashboard layer was not found.');
  items.splice(targetIndex + 1, 0, structuredClone(source));

  const originalOrder = document.items.map((item) => item.id).join('\u0000');
  const nextOrder = items.map((item) => item.id).join('\u0000');
  if (originalOrder === nextOrder) return result(document, 'unchanged');
  return result({ ...document, items }, 'committed');
}

export function moveDashboardLayerToBack(
  document: FrakonDashboardDocument,
  id: string,
): DashboardLayerResult {
  const target = document.items.find((item) => item.id === id);
  if (!target) return result(document, 'invalid', 'Dashboard layer was not found.');
  if (target.locked) return result(document, 'invalid', 'Locked layers cannot be reordered.');
  if (document.items[0]?.id === id) return result(document, 'unchanged');
  return result({
    ...document,
    items: [structuredClone(target), ...document.items.filter((item) => item.id !== id).map((item) => structuredClone(item))],
  }, 'committed');
}
