import type { FrakonBreakpoint } from './layout-model';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import {
  createResponsiveCanvasV2Revision,
  type ResponsiveCanvasV2RevisionEnvelope,
} from './responsive-v2-revision';
import {
  responsiveCanvasV2WriteReadiness,
  type ResponsiveCanvasV2WriteReadiness,
} from './responsive-v2-write-readiness';

export interface ResponsiveCanvasV2BreakpointSaveSummary {
  breakpoint: FrakonBreakpoint;
  itemCount: number;
  lockedItemCount: number;
  constraintCount: number;
  dirty: boolean;
}

export interface ResponsiveCanvasV2SavePreview {
  hasLocalChanges: boolean;
  wouldWrite: boolean;
  dirtyBreakpoints: FrakonBreakpoint[];
  breakpoints: ResponsiveCanvasV2BreakpointSaveSummary[];
  readiness: ResponsiveCanvasV2WriteReadiness;
  baseRevision?: string;
  candidate: ResponsiveCanvasV2RevisionEnvelope;
}

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

export function createResponsiveCanvasV2SavePreview(
  controller: ResponsiveV2DraftController,
  capabilities: DashboardServerCapabilities,
  clientId: string,
  base?: ResponsiveCanvasV2RevisionEnvelope,
  options: { now?: number; hasUnresolvedConflict?: boolean } = {},
): ResponsiveCanvasV2SavePreview {
  const snapshot = controller.snapshot;
  const bundle = controller.toBundle();
  const dirty = new Set(snapshot.dirtyBreakpoints);
  const readiness = responsiveCanvasV2WriteReadiness(capabilities, bundle, {
    hasUnresolvedConflict: options.hasUnresolvedConflict,
  });
  const candidate = createResponsiveCanvasV2Revision(bundle, clientId, base, options.now ?? Date.now());
  const breakpoints = BREAKPOINTS.flatMap((breakpoint) => {
    const document = bundle.documents[breakpoint];
    if (!document) return [];
    return [{
      breakpoint,
      itemCount: document.items.length,
      lockedItemCount: document.items.filter((item) => item.locked).length,
      constraintCount: document.constraints?.length ?? 0,
      dirty: dirty.has(breakpoint),
    }];
  });

  return {
    hasLocalChanges: dirty.size > 0,
    wouldWrite: dirty.size > 0 && readiness.allowed,
    dirtyBreakpoints: [...snapshot.dirtyBreakpoints],
    breakpoints,
    readiness,
    baseRevision: base?.revision,
    candidate,
  };
}
