import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2CardConfigPatchResult {
  status: 'committed' | 'unchanged' | 'missing-item' | 'invalid';
  document: FrakonDashboardDocumentV2;
  reason?: string;
}

export type DashboardCanvasV2CardConfigField =
  | { key: 'entity' | 'name' | 'title'; kind: 'text' }
  | { key: 'show_brightness' | 'show_position' | 'show_state' | 'show_volume'; kind: 'boolean' }
  | { key: 'step'; kind: 'number'; min: number; max: number };

const GENERIC_FIELDS: readonly DashboardCanvasV2CardConfigField[] = [
  { key: 'entity', kind: 'text' },
  { key: 'name', kind: 'text' },
  { key: 'title', kind: 'text' },
];

const TYPE_FIELDS: Record<string, readonly DashboardCanvasV2CardConfigField[]> = {
  'custom:frakon-light-card': [{ key: 'show_brightness', kind: 'boolean' }],
  'custom:frakon-climate-card': [{ key: 'step', kind: 'number', min: 0.1, max: 10 }],
  'custom:frakon-cover-card': [{ key: 'show_position', kind: 'boolean' }],
  'custom:frakon-camera-card': [{ key: 'show_state', kind: 'boolean' }],
  'custom:frakon-media-player-card': [{ key: 'show_volume', kind: 'boolean' }],
};

export function dashboardCanvasV2CardConfigFields(card: Record<string, unknown>): DashboardCanvasV2CardConfigField[] {
  const type = typeof card.type === 'string' ? card.type : '';
  return [...GENERIC_FIELDS, ...(TYPE_FIELDS[type] ?? [])].map((field) => ({ ...field }));
}

function fieldFor(card: Record<string, unknown>, key: string): DashboardCanvasV2CardConfigField | undefined {
  return dashboardCanvasV2CardConfigFields(card).find((field) => field.key === key);
}

function normalizeFieldValue(field: DashboardCanvasV2CardConfigField, value: unknown): { valid: true; value: unknown } | { valid: false; reason: string } {
  if (field.kind === 'text') {
    if (value === undefined || value === null || value === '') return { valid: true, value: undefined };
    if (typeof value !== 'string') return { valid: false, reason: `${field.key} must be a string.` };
    return { valid: true, value: value.trim() || undefined };
  }
  if (field.kind === 'boolean') {
    if (typeof value !== 'boolean') return { valid: false, reason: `${field.key} must be a boolean.` };
    return { valid: true, value };
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) {
    return { valid: false, reason: `${field.key} must be a finite number between ${field.min} and ${field.max}.` };
  }
  return { valid: true, value };
}

export function patchDashboardCanvasV2CardConfig(
  document: FrakonDashboardDocumentV2,
  itemId: string,
  patch: Record<string, unknown>,
): DashboardCanvasV2CardConfigPatchResult {
  const item = document.items.find((entry) => entry.id === itemId);
  if (!item) return { status: 'missing-item', document: structuredClone(document), reason: `Unknown item ${itemId}.` };
  const keys = Object.keys(patch);
  if (!keys.length) return { status: 'invalid', document: structuredClone(document), reason: 'Card config patch is empty.' };

  const card = { ...item.card };
  for (const key of keys) {
    const field = fieldFor(card, key);
    if (!field) {
      return { status: 'invalid', document: structuredClone(document), reason: `Card config field ${key} is not supported for ${String(card.type ?? 'unknown')}.` };
    }
    const normalized = normalizeFieldValue(field, patch[key]);
    if (!normalized.valid) return { status: 'invalid', document: structuredClone(document), reason: normalized.reason };
    if (normalized.value === undefined) delete card[key];
    else card[key] = normalized.value;
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
