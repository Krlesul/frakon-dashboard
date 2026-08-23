import type { FrakonBreakpoint } from './layout-model';
import { isDashboardDocumentV2, normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { ResponsiveCanvasV2Documents } from './responsive-layout-v2';

export interface ResponsiveCanvasV2Bundle {
  kind: 'responsive-canvas-v2';
  id: string;
  title: string;
  defaultBreakpoint: FrakonBreakpoint;
  documents: ResponsiveCanvasV2Documents;
}

export const RESPONSIVE_CANVAS_V2_MAX_ITEMS = 2000;
export const RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS = 4000;
export const RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES = 2_000_000;

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
const CONSTRAINT_KINDS = new Set([
  'align-left', 'align-center-x', 'align-right', 'align-top', 'align-center-y', 'align-bottom',
  'below', 'right-of', 'match-width', 'match-height',
]);
const RESPONSIVE_BUNDLE_CARRIER = Symbol('frakon-responsive-canvas-v2-bundle');

type ResponsiveBundleCarrierDocument = FrakonDashboardDocumentV2 & {
  [RESPONSIVE_BUNDLE_CARRIER]?: ResponsiveCanvasV2Bundle;
};

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function serializedUtf8Bytes(value: unknown): number | undefined {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return undefined;
  }
}

function hasConstraintCycle(document: FrakonDashboardDocumentV2): boolean {
  const graph = new Map<string, string[]>();
  for (const constraint of document.constraints ?? []) {
    if (constraint.enabled === false) continue;
    const edges = graph.get(constraint.sourceId) ?? [];
    edges.push(constraint.targetId);
    graph.set(constraint.sourceId, edges);
  }
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): boolean => {
    const current = state.get(id) ?? 0;
    if (current === 1) return true;
    if (current === 2) return false;
    state.set(id, 1);
    for (const target of graph.get(id) ?? []) {
      if (visit(target)) return true;
    }
    state.set(id, 2);
    return false;
  };
  return [...graph.keys()].some(visit);
}

function validConstraints(document: FrakonDashboardDocumentV2, itemIds: ReadonlySet<string>): boolean {
  const constraints = document.constraints ?? [];
  if (constraints.length > RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS) return false;
  const ids = new Set<string>();
  for (const constraint of constraints) {
    if (!constraint || typeof constraint !== 'object') return false;
    if (!constraint.id || ids.has(constraint.id)) return false;
    ids.add(constraint.id);
    if (!CONSTRAINT_KINDS.has(constraint.kind)) return false;
    if (!itemIds.has(constraint.sourceId) || !itemIds.has(constraint.targetId)) return false;
    if (constraint.sourceId === constraint.targetId) return false;
    if (constraint.gap !== undefined && !Number.isFinite(constraint.gap)) return false;
    if (constraint.priority !== undefined && !Number.isFinite(constraint.priority)) return false;
    if (constraint.enabled !== undefined && typeof constraint.enabled !== 'boolean') return false;
  }
  return !hasConstraintCycle(document);
}

function validDocumentSafety(document: FrakonDashboardDocumentV2): boolean {
  if (!finitePositive(document.layout.width) || !finitePositive(document.layout.minHeight)) return false;
  if (document.items.length > RESPONSIVE_CANVAS_V2_MAX_ITEMS) return false;
  const ids = new Set<string>();
  for (const item of document.items) {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    if (!finiteNonNegative(item.frame.x) || !finiteNonNegative(item.frame.y)) return false;
    if (!finitePositive(item.frame.width) || !finitePositive(item.frame.height)) return false;
  }
  return validConstraints(document, ids);
}

export function createResponsiveCanvasV2Bundle(
  documents: ResponsiveCanvasV2Documents,
  defaultBreakpoint: FrakonBreakpoint,
): ResponsiveCanvasV2Bundle {
  const first = documents[defaultBreakpoint] ?? BREAKPOINTS.map((bp) => documents[bp]).find(Boolean);
  if (!first) throw new Error('Responsive canvas bundle requires at least one document.');
  const normalized: ResponsiveCanvasV2Documents = {};
  for (const breakpoint of BREAKPOINTS) {
    const document = documents[breakpoint];
    if (!document) continue;
    normalized[breakpoint] = normalizeDashboardV2({
      ...structuredClone(document),
      id: first.id,
      title: first.title,
      breakpoint,
    });
  }
  return {
    kind: 'responsive-canvas-v2',
    id: first.id,
    title: first.title,
    defaultBreakpoint: normalized[defaultBreakpoint] ? defaultBreakpoint : (first.breakpoint as FrakonBreakpoint),
    documents: normalized,
  };
}

export function isResponsiveCanvasV2Bundle(value: unknown): value is ResponsiveCanvasV2Bundle {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ResponsiveCanvasV2Bundle>;
  if (candidate.kind !== 'responsive-canvas-v2' || typeof candidate.id !== 'string' || !candidate.id || typeof candidate.title !== 'string') return false;
  if (!candidate.documents || typeof candidate.documents !== 'object') return false;
  const documents = candidate.documents as ResponsiveCanvasV2Documents;
  const present = BREAKPOINTS.filter((bp) => documents[bp] !== undefined);
  if (!present.length || present.length > BREAKPOINTS.length) return false;
  if (!candidate.defaultBreakpoint || !present.includes(candidate.defaultBreakpoint)) return false;
  let totalItems = 0;
  for (const breakpoint of present) {
    const document = documents[breakpoint];
    if (!isDashboardDocumentV2(document) || document.id !== candidate.id || document.breakpoint !== breakpoint) return false;
    if (!validDocumentSafety(document)) return false;
    totalItems += document.items.length;
    if (totalItems > RESPONSIVE_CANVAS_V2_MAX_ITEMS) return false;
  }
  const bytes = serializedUtf8Bytes(value);
  if (bytes === undefined || bytes > RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES) return false;
  return true;
}

export function responsiveCanvasV2BundleDocument(
  bundle: ResponsiveCanvasV2Bundle,
  breakpoint: FrakonBreakpoint,
): FrakonDashboardDocumentV2 | undefined {
  const document = bundle.documents[breakpoint];
  return document ? structuredClone(document) : undefined;
}

export function attachResponsiveCanvasV2Bundle(
  document: FrakonDashboardDocumentV2,
  bundle: ResponsiveCanvasV2Bundle,
): FrakonDashboardDocumentV2 {
  const carrier = structuredClone(document) as ResponsiveBundleCarrierDocument;
  Object.defineProperty(carrier, RESPONSIVE_BUNDLE_CARRIER, {
    value: structuredClone(bundle),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return carrier;
}

export function responsiveCanvasV2BundleFromDocument(
  document: FrakonDashboardDocumentV2,
): ResponsiveCanvasV2Bundle | undefined {
  const bundle = (document as ResponsiveBundleCarrierDocument)[RESPONSIVE_BUNDLE_CARRIER];
  return bundle ? structuredClone(bundle) : undefined;
}
