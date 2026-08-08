import type { FrakonBreakpoint } from './layout-model';
import { createResponsiveCanvasV2Bundle, type ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';

export interface ResponsiveCanvasV2MergeConflict {
  breakpoint: FrakonBreakpoint;
  reason: 'concurrent-change' | 'concurrent-add-remove';
}

export interface ResponsiveCanvasV2MergeResult {
  bundle: ResponsiveCanvasV2Bundle;
  conflicts: ResponsiveCanvasV2MergeConflict[];
}

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function mergeResponsiveCanvasV2Bundles(
  base: ResponsiveCanvasV2Bundle,
  local: ResponsiveCanvasV2Bundle,
  remote: ResponsiveCanvasV2Bundle,
): ResponsiveCanvasV2MergeResult {
  if (base.id !== local.id || base.id !== remote.id) throw new Error('Cannot merge responsive bundles with different ids.');
  const documents: ResponsiveCanvasV2Bundle['documents'] = {};
  const conflicts: ResponsiveCanvasV2MergeConflict[] = [];

  for (const breakpoint of BREAKPOINTS) {
    const baseDoc = base.documents[breakpoint];
    const localDoc = local.documents[breakpoint];
    const remoteDoc = remote.documents[breakpoint];

    if (same(localDoc, remoteDoc)) {
      if (localDoc) documents[breakpoint] = structuredClone(localDoc);
      continue;
    }
    if (same(localDoc, baseDoc)) {
      if (remoteDoc) documents[breakpoint] = structuredClone(remoteDoc);
      continue;
    }
    if (same(remoteDoc, baseDoc)) {
      if (localDoc) documents[breakpoint] = structuredClone(localDoc);
      continue;
    }

    conflicts.push({
      breakpoint,
      reason: baseDoc && localDoc && remoteDoc ? 'concurrent-change' : 'concurrent-add-remove',
    });
    // Fail safe: keep remote as the canonical merge placeholder until the conflict is explicitly resolved.
    if (remoteDoc) documents[breakpoint] = structuredClone(remoteDoc);
    else if (localDoc) documents[breakpoint] = structuredClone(localDoc);
    else if (baseDoc) documents[breakpoint] = structuredClone(baseDoc);
  }

  const fallback = documents[remote.defaultBreakpoint]
    ? remote.defaultBreakpoint
    : documents[local.defaultBreakpoint]
      ? local.defaultBreakpoint
      : BREAKPOINTS.find((bp) => documents[bp]) ?? 'desktop';

  return {
    bundle: createResponsiveCanvasV2Bundle(documents, fallback),
    conflicts,
  };
}
