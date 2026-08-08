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

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
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

function validDocumentSafety(document: FrakonDashboardDocumentV2): boolean {
  if (!finitePositive(document.layout.width) || !finitePositive(document.layout.minHeight)) return false;
  if (document.items.length > RESPONSIVE_CANVAS_V2_MAX_ITEMS) return false;
  if ((document.constraints?.length ?? 0) > RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS) return false;
  const ids = new Set<string>();
  for (const item of document.items) {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    if (!finiteNonNegative(item.frame.x) || !finiteNonNegative(item.frame.y)) return false;
    if (!finitePositive(item.frame.width) || !finitePositive(item.frame.height)) return false;
  }
  return true;
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
