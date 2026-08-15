import { normalizeDashboard, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';
import {
  isDashboardDocumentV2,
  normalizeDashboardV2,
  type FrakonDashboardDocumentV2,
} from './layout-model-v2';

export type FrakonDashboardAnyDocument = FrakonDashboardDocument | FrakonDashboardDocumentV2;

export type DashboardDocumentDecodeResult =
  | { ok: true; document: FrakonDashboardAnyDocument }
  | { ok: false; reason: 'invalid-json' | 'unsupported-version' | 'invalid-document' };

const BREAKPOINTS = new Set(['mobile', 'tablet', 'desktop', 'wide']);
const CONSTRAINT_KINDS = new Set([
  'align-left',
  'align-center-x',
  'align-right',
  'align-top',
  'align-center-y',
  'align-bottom',
  'below',
  'right-of',
  'match-width',
  'match-height',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isV1Item(value: unknown): value is FrakonGridItem {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && isRecord(value.card)
    && typeof value.card.type === 'string'
    && value.card.type.length > 0
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isFiniteNumber(value.w)
    && isFiniteNumber(value.h)
    && optionalFiniteNumber(value.minW)
    && optionalFiniteNumber(value.minH)
    && optionalFiniteNumber(value.maxW)
    && optionalFiniteNumber(value.maxH)
    && optionalBoolean(value.locked)
    && optionalBoolean(value.hidden);
}

function validConstraints(value: unknown, itemIds: Set<string>): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const constraintIds = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) return false;
    if (typeof entry.id !== 'string' || !entry.id || constraintIds.has(entry.id)) return false;
    if (typeof entry.kind !== 'string' || !CONSTRAINT_KINDS.has(entry.kind)) return false;
    if (typeof entry.sourceId !== 'string' || typeof entry.targetId !== 'string') return false;
    if (entry.sourceId === entry.targetId) return false;
    if (!itemIds.has(entry.sourceId) || !itemIds.has(entry.targetId)) return false;
    if (!optionalFiniteNumber(entry.gap) || !optionalFiniteNumber(entry.priority)) return false;
    if (!optionalBoolean(entry.enabled)) return false;
    constraintIds.add(entry.id);
  }
  return true;
}

export function isDashboardDocumentV1(value: unknown): value is FrakonDashboardDocument {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.id !== 'string' || !value.id) return false;
  if (typeof value.title !== 'string') return false;
  if (typeof value.breakpoint !== 'string' || !BREAKPOINTS.has(value.breakpoint)) return false;
  if (!isFiniteNumber(value.columns) || value.columns <= 0) return false;
  if (!isFiniteNumber(value.rowHeight) || value.rowHeight <= 0) return false;
  if (!isFiniteNumber(value.gap) || value.gap < 0) return false;
  if (!Array.isArray(value.items) || !value.items.every(isV1Item)) return false;

  const itemIds = new Set<string>();
  for (const item of value.items) {
    if (itemIds.has(item.id)) return false;
    itemIds.add(item.id);
  }
  return validConstraints(value.constraints, itemIds);
}

export function normalizeAnyDashboardDocument(document: FrakonDashboardAnyDocument): FrakonDashboardAnyDocument {
  return document.version === 2
    ? normalizeDashboardV2(document)
    : normalizeDashboard(document);
}

export function decodeDashboardDocument(source: string): DashboardDocumentDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  if (isDashboardDocumentV2(parsed)) {
    try {
      return { ok: true, document: normalizeDashboardV2(parsed) };
    } catch {
      return { ok: false, reason: 'invalid-document' };
    }
  }

  if (isDashboardDocumentV1(parsed)) {
    try {
      return { ok: true, document: normalizeDashboard(parsed) };
    } catch {
      return { ok: false, reason: 'invalid-document' };
    }
  }

  const version = isRecord(parsed) ? parsed.version : undefined;
  return {
    ok: false,
    reason: version === 1 || version === 2 ? 'invalid-document' : 'unsupported-version',
  };
}

export function encodeDashboardDocument(document: FrakonDashboardAnyDocument): string {
  return JSON.stringify(normalizeAnyDashboardDocument(document), null, 2);
}
