import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2CardConfigPatchResult {
  status: 'committed' | 'unchanged' | 'missing-item' | 'invalid';
  document: FrakonDashboardDocumentV2;
  reason?: string;
}

export type DashboardCanvasV2CardConfigField =
  | { key: 'entity' | 'temperature_entity' | 'humidity_entity' | 'range_entity' | 'charging_power_entity' | 'charging_switch_entity' | 'energy_entity' | 'price_entity'; kind: 'entity'; required?: boolean; domains?: readonly string[]; deviceClasses?: readonly string[] }
  | { key: 'name' | 'title' | 'unit'; kind: 'text' }
  | { key: 'light_entities'; kind: 'entity-list'; domains?: readonly string[] }
  | { key: 'show_brightness' | 'show_color_temperature' | 'show_position' | 'show_state' | 'show_volume' | 'compact'; kind: 'boolean' }
  | { key: 'step' | 'precision'; kind: 'number'; min: number; max: number; integer?: boolean }
  | { key: 'aspect_ratio'; kind: 'select'; options: readonly string[] };

const STRICT_PRIMARY_DOMAINS: Record<string, readonly string[]> = {
  'custom:frakon-light-card': ['light'],
  'custom:frakon-climate-card': ['climate'],
  'custom:frakon-cover-card': ['cover'],
  'custom:frakon-camera-card': ['camera'],
  'custom:frakon-media-player-card': ['media_player'],
  'custom:frakon-switch-card': ['switch'],
  'custom:frakon-lock-card': ['lock'],
  'custom:frakon-binary-sensor-card': ['binary_sensor'],
  'custom:frakon-action-card': ['button', 'input_button', 'script', 'scene'],
};

const TYPE_FIELDS: Record<string, readonly DashboardCanvasV2CardConfigField[]> = {
  'custom:frakon-sensor-card': [
    { key: 'precision', kind: 'number', min: 0, max: 6, integer: true },
    { key: 'unit', kind: 'text' },
    { key: 'compact', kind: 'boolean' },
  ],
  'custom:frakon-room-card': [
    { key: 'temperature_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['temperature'] },
    { key: 'humidity_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['humidity'] },
    { key: 'light_entities', kind: 'entity-list', domains: ['light'] },
  ],
  'custom:frakon-light-card': [
    { key: 'show_brightness', kind: 'boolean' },
    { key: 'show_color_temperature', kind: 'boolean' },
    { key: 'compact', kind: 'boolean' },
  ],
  'custom:frakon-climate-card': [{ key: 'step', kind: 'number', min: 0.1, max: 10 }],
  'custom:frakon-cover-card': [{ key: 'show_position', kind: 'boolean' }],
  'custom:frakon-switch-card': [{ key: 'show_state', kind: 'boolean' }],
  'custom:frakon-lock-card': [{ key: 'show_state', kind: 'boolean' }],
  'custom:frakon-binary-sensor-card': [{ key: 'show_state', kind: 'boolean' }],
  'custom:frakon-action-card': [{ key: 'show_state', kind: 'boolean' }],
  'custom:frakon-camera-card': [
    { key: 'show_state', kind: 'boolean' },
    { key: 'aspect_ratio', kind: 'select', options: ['16 / 9', '4 / 3', '1 / 1'] },
  ],
  'custom:frakon-media-player-card': [{ key: 'show_volume', kind: 'boolean' }],
  'custom:frakon-vehicle-card': [
    { key: 'range_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['distance'] },
    { key: 'charging_power_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['power'] },
    { key: 'charging_switch_entity', kind: 'entity', domains: ['switch'] },
  ],
  'custom:frakon-energy-card': [
    { key: 'energy_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['energy'] },
    { key: 'price_entity', kind: 'entity', domains: ['sensor'], deviceClasses: ['monetary'] },
    { key: 'compact', kind: 'boolean' },
  ],
};

export function dashboardCanvasV2CardConfigFields(card: Record<string, unknown>): DashboardCanvasV2CardConfigField[] {
  const type = typeof card.type === 'string' ? card.type : '';
  const primary: DashboardCanvasV2CardConfigField = {
    key: 'entity',
    kind: 'entity',
    required: true,
    ...(STRICT_PRIMARY_DOMAINS[type] ? { domains: STRICT_PRIMARY_DOMAINS[type] } : {}),
  };
  const fields: DashboardCanvasV2CardConfigField[] = [
    primary,
    { key: 'name', kind: 'text' },
    { key: 'title', kind: 'text' },
    ...(TYPE_FIELDS[type] ?? []),
  ];
  return fields.map((field) => structuredClone(field));
}

function fieldFor(card: Record<string, unknown>, key: string): DashboardCanvasV2CardConfigField | undefined {
  return dashboardCanvasV2CardConfigFields(card).find((field) => field.key === key);
}

function entityDomainValid(entityId: string, domains?: readonly string[]): boolean {
  if (!domains?.length) return entityId.includes('.') && !entityId.startsWith('.') && !entityId.endsWith('.');
  return domains.some((domain) => entityId.startsWith(`${domain}.`) && entityId.length > domain.length + 1);
}

function normalizeFieldValue(
  field: DashboardCanvasV2CardConfigField,
  value: unknown,
): { valid: true; value: unknown } | { valid: false; reason: string } {
  if (field.kind === 'text') {
    if (value === undefined || value === null || value === '') return { valid: true, value: undefined };
    if (typeof value !== 'string') return { valid: false, reason: `${field.key} must be a string.` };
    return { valid: true, value: value.trim() || undefined };
  }
  if (field.kind === 'entity') {
    if (value === undefined || value === null || value === '') {
      return field.required
        ? { valid: false, reason: `${field.key} is required.` }
        : { valid: true, value: undefined };
    }
    if (typeof value !== 'string') return { valid: false, reason: `${field.key} must be an entity id string.` };
    const normalized = value.trim();
    if (!entityDomainValid(normalized, field.domains)) {
      const expected = field.domains?.length ? field.domains.map((domain) => `${domain}.*`).join(' or ') : 'domain.object_id';
      return { valid: false, reason: `${field.key} must match ${expected}.` };
    }
    return { valid: true, value: normalized };
  }
  if (field.kind === 'entity-list') {
    if (!Array.isArray(value)) return { valid: false, reason: `${field.key} must be an entity id array.` };
    const normalized = value.map((entry) => typeof entry === 'string' ? entry.trim() : '').filter(Boolean);
    if (normalized.some((entry) => !entityDomainValid(entry, field.domains))) {
      const expected = field.domains?.length ? field.domains.map((domain) => `${domain}.*`).join(' or ') : 'domain.object_id';
      return { valid: false, reason: `${field.key} entries must match ${expected}.` };
    }
    return { valid: true, value: [...new Set(normalized)] };
  }
  if (field.kind === 'boolean') {
    if (typeof value !== 'boolean') return { valid: false, reason: `${field.key} must be a boolean.` };
    return { valid: true, value };
  }
  if (field.kind === 'select') {
    if (typeof value !== 'string' || !field.options.includes(value)) {
      return { valid: false, reason: `${field.key} must be one of: ${field.options.join(', ')}.` };
    }
    return { valid: true, value };
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max || (field.integer && !Number.isInteger(value))) {
    const integer = field.integer ? ' integer' : '';
    return { valid: false, reason: `${field.key} must be a finite${integer} number between ${field.min} and ${field.max}.` };
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
