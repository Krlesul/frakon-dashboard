import type { FrakonBreakpoint } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';
import type { ResponsiveV2SavedState } from './responsive-v2-saved-state';

export interface ResponsiveV2SavedHost {
  nativeV2Document?: FrakonDashboardDocumentV2;
  nativeV2Revision?: string;
  nativeV2DraftDirty?: boolean;
  nativeV2CanUndo?: boolean;
  nativeV2CanRedo?: boolean;
  nativeV2ActiveBreakpoint?: FrakonBreakpoint;
  nativeV2AvailableBreakpoints?: FrakonBreakpoint[];
  nativeV2DirtyBreakpoints?: FrakonBreakpoint[];
  message?: string;
  requestUpdate?: () => unknown;
}

export interface ResponsiveV2SavedEventDetail {
  envelope: ResponsiveCanvasV2RevisionEnvelope;
  state: ResponsiveV2SavedState;
}

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

export function applyResponsiveV2SavedStateToHost(
  host: ResponsiveV2SavedHost,
  detail: ResponsiveV2SavedEventDetail,
): void {
  const { envelope, state } = detail;
  const activeDocument = envelope.bundle.documents[state.activeBreakpoint]
    ?? envelope.bundle.documents[envelope.bundle.defaultBreakpoint];

  if (activeDocument) host.nativeV2Document = structuredClone(activeDocument);
  host.nativeV2Revision = state.revision;
  host.nativeV2DraftDirty = state.dirtyBreakpoints.length > 0;
  host.nativeV2CanUndo = state.canUndo;
  host.nativeV2CanRedo = state.canRedo;
  host.nativeV2ActiveBreakpoint = state.activeBreakpoint;
  host.nativeV2AvailableBreakpoints = BREAKPOINTS.filter((breakpoint) => !!envelope.bundle.documents[breakpoint]);
  host.nativeV2DirtyBreakpoints = [...state.dirtyBreakpoints];
  host.message = undefined;
  host.requestUpdate?.();
}
