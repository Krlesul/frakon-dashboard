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
const MAX_ITEMS = 2000;
const MAX_CONSTRAINTS = 4000;
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

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function optionalPositiveNumber(value: unknown): boolean {
  return value === undefined || isPositiveNumber(value);
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isIdentifier(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isV1Item(value: unknown, columns: number): value is FrakonGridItem {
  if (!isRecord(value)) return false;
  if (!isIdentifier(value.id, 128)) return false;
  if (!isRecord(value.card) || !isIdentifier(value.card.type, Number.MAX_SAFE_INTEGER)) return false;
  if (!isFiniteNumber(value.x) || value.x < 0) return false;
  if (!isFiniteNumber(value.y) || value.y < 0) return false;
  if (!isPositiveNumber(value.w) || !isPositiveNumber(value.h)) return false;
  if (value.x + value.w > columns) return false;
  if (!optionalPositiveNumber(value.minW)
    || !optionalPositiveNumber(value.minH)
    || !optionalPositiveNumber(value.maxW)
    || !optionalPositiveNumber(value.maxH)) return false;
  if (isPositiveNumber(value.minW) && isPositiveNumber(value.maxW) && value.minW > value.maxW) return false;
  if (isPositiveNumber(value.minH) && isPositiveNumber(value.maxH) && value.minH > value.maxH) return false;
  return optionalBoolean(value.locked) && optionalBoolean(value.hidden);
}

function validConstraints(value: unknown, itemIds: Set<string>): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > MAX_CONSTRAINTS) return false;
  const constraintIds = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) return false;
    if (!isIdentifier(entry.id, 256) || constraintIds.has(entry.id)) return false;
    if (typeof entry.kind !== 'string' || !CONSTRAINT_KINDS.has(entry.kind)) return false;
    if (!isIdentifier(entry.sourceId, 128) || !isIdentifier(entry.targetId, 128)) return false;
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
  if (!isIdentifier(value.id, 128)) return false;
  if (typeof value.title !== 'string') return false;
  if (typeof value.breakpoint !== 'string' || !BREAKPOINTS.has(value.breakpoint)) return false;
  if (!isPositiveNumber(value.columns)) return false;
  if (!isPositiveNumber(value.rowHeight)) return false;
  if (!isFiniteNumber(value.gap) || value.gap < 0) return false;
  if (!Array.isArray(value.items) || value.items.length > MAX_ITEMS) return false;
  if (!value.items.every((item) => isV1Item(item, value.columns as number))) return false;

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
