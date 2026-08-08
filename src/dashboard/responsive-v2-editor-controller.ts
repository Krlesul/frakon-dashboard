import type { FrakonBreakpoint } from './layout-model';
import {
  resolveResponsiveCanvasV2Breakpoint,
  type ResponsiveCanvasV2BreakpointMode,
} from './responsive-v2-breakpoint-policy';
import { ResponsiveV2DraftController, type ResponsiveV2DraftSnapshot } from './responsive-v2-draft-controller';

export interface ResponsiveV2EditorSnapshot {
  mode: ResponsiveCanvasV2BreakpointMode;
  width: number;
  draft: ResponsiveV2DraftSnapshot;
}

export class ResponsiveV2EditorController {
  private mode: ResponsiveCanvasV2BreakpointMode;
  private width: number;

  constructor(
    readonly draftController: ResponsiveV2DraftController,
    width: number,
    mode: ResponsiveCanvasV2BreakpointMode = { kind: 'manual', breakpoint: draftController.snapshot.activeBreakpoint },
  ) {
    this.width = Math.max(1, width);
    this.mode = structuredClone(mode);
    this.applyMode();
  }

  get snapshot(): ResponsiveV2EditorSnapshot {
    return {
      mode: structuredClone(this.mode),
      width: this.width,
      draft: this.draftController.snapshot,
    };
  }

  setMode(mode: ResponsiveCanvasV2BreakpointMode): ResponsiveV2EditorSnapshot {
    this.mode = structuredClone(mode);
    this.applyMode();
    return this.snapshot;
  }

  resize(width: number): ResponsiveV2EditorSnapshot {
    this.width = Math.max(1, width);
    if (this.mode.kind === 'auto') this.applyMode();
    return this.snapshot;
  }

  selectBreakpoint(breakpoint: FrakonBreakpoint): ResponsiveV2EditorSnapshot {
    this.mode = { kind: 'manual', breakpoint };
    this.draftController.switchTo(breakpoint);
    return this.snapshot;
  }

  copyLayoutFrom(source: FrakonBreakpoint): ResponsiveV2EditorSnapshot {
    this.draftController.copyLayoutFrom(source);
    return this.snapshot;
  }

  resetActiveBreakpoint(): ResponsiveV2EditorSnapshot {
    this.draftController.resetBreakpoint(this.draftController.snapshot.activeBreakpoint);
    return this.snapshot;
  }

  private applyMode(): void {
    const breakpoint = resolveResponsiveCanvasV2Breakpoint(this.mode, this.width);
    this.draftController.switchTo(breakpoint);
  }
}
