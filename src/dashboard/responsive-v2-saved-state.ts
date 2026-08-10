import type { FrakonBreakpoint } from './layout-model';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

export interface ResponsiveV2SavedState {
  revision: string;
  activeBreakpoint: FrakonBreakpoint;
  dirtyBreakpoints: FrakonBreakpoint[];
  canUndo: boolean;
  canRedo: boolean;
}

export function responsiveV2SavedState(
  controller: ResponsiveV2DraftController,
  envelope: ResponsiveCanvasV2RevisionEnvelope,
): ResponsiveV2SavedState {
  const snapshot = controller.snapshot;
  return {
    revision: envelope.revision,
    activeBreakpoint: snapshot.activeBreakpoint,
    dirtyBreakpoints: [...snapshot.dirtyBreakpoints],
    canUndo: snapshot.active.canUndo,
    canRedo: snapshot.active.canRedo,
  };
}
