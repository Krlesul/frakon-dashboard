import type { FrakonBreakpoint } from './layout-model';
import { deriveDashboardCanvasV2Breakpoint, type ResponsiveCanvasV2Documents, defaultResponsiveCanvasV2Widths } from './responsive-layout-v2';

export interface ResponsiveCanvasV2CopyResult {
  status: 'committed' | 'missing-source' | 'unchanged';
  documents: ResponsiveCanvasV2Documents;
  target: FrakonBreakpoint;
}

export function copyResponsiveCanvasV2Layout(
  documents: ResponsiveCanvasV2Documents,
  source: FrakonBreakpoint,
  target: FrakonBreakpoint,
): ResponsiveCanvasV2CopyResult {
  const sourceDocument = documents[source];
  if (!sourceDocument) return { status: 'missing-source', documents: structuredClone(documents), target };
  const derived = deriveDashboardCanvasV2Breakpoint(sourceDocument, target, defaultResponsiveCanvasV2Widths).document;
  const current = documents[target];
  if (current && JSON.stringify(current) === JSON.stringify(derived)) {
    return { status: 'unchanged', documents: structuredClone(documents), target };
  }
  return {
    status: 'committed',
    documents: { ...structuredClone(documents), [target]: derived },
    target,
  };
}
