import type { FrakonCardTemplate } from './card-catalog';
import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonCanvasItem, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2InsertCardResult {
  status: 'committed' | 'invalid';
  document: FrakonDashboardDocumentV2;
  selectedIds: string[];
  reason?: string;
}

function slug(value: string): string {
  const normalized = value.toLowerCase().replace(/^custom:/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'card';
}

function uniqueId(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function cardSize(document: FrakonDashboardDocumentV2, template: FrakonCardTemplate): { width: number; height: number } {
  const snap = Math.max(1, document.layout.snap.size);
  const column = document.layout.width / 12;
  const width = Math.max(snap * 4, Math.round((column * template.defaultWidth) / snap) * snap);
  const height = Math.max(snap * 4, Math.round((64 * template.defaultHeight) / snap) * snap);
  return { width: Math.min(document.layout.width, width), height };
}

export function insertDashboardCanvasV2Card(
  document: FrakonDashboardDocumentV2,
  template: FrakonCardTemplate,
  entity?: string,
): DashboardCanvasV2InsertCardResult {
  if (!template?.type || typeof template.createConfig !== 'function') {
    return { status: 'invalid', document: structuredClone(document), selectedIds: [], reason: 'Invalid card template.' };
  }
  const size = cardSize(document, template);
  const snap = Math.max(1, document.layout.snap.size);
  const used = new Set(document.items.map((item) => item.id));
  const id = uniqueId(slug(template.type), used);
  const config = template.createConfig(entity);
  const maxY = Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height), 0);
  const searchBottom = Math.max(maxY + size.height + snap * 8, document.layout.minHeight + size.height);

  let frame: FrakonCanvasItem['frame'] | undefined;
  for (let y = 0; y <= searchBottom && !frame; y += snap) {
    for (let x = 0; x + size.width <= document.layout.width; x += snap) {
      const candidateItem: FrakonCanvasItem = { id, card: structuredClone(config), frame: { x, y, ...size } };
      const candidate = normalizeDashboardV2({ ...document, items: [...document.items, candidateItem] });
      if (!canvasV2CollisionIds(candidate.items).length) {
        frame = candidateItem.frame;
        break;
      }
    }
  }

  if (!frame) frame = { x: 0, y: Math.ceil((maxY + snap) / snap) * snap, ...size };
  const item: FrakonCanvasItem = { id, card: structuredClone(config), frame };
  const next = normalizeDashboardV2({
    ...document,
    layout: { ...document.layout, minHeight: Math.max(document.layout.minHeight, frame.y + frame.height) },
    items: [...document.items, item],
  });
  return { status: 'committed', document: next, selectedIds: [id] };
}
