import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { createResponsiveCanvasV2SavePreview, type ResponsiveCanvasV2SavePreview } from './responsive-v2-save-preview';

export interface ResponsiveCanvasV2SavePreviewSessionInput {
  controller: ResponsiveV2DraftController;
  capabilities: DashboardServerCapabilities;
  baseRevision?: string;
  hasUnresolvedConflict?: boolean;
}

function fingerprint(input: ResponsiveCanvasV2SavePreviewSessionInput): string {
  const responsive = input.capabilities.responsiveCanvasV2;
  return JSON.stringify({
    bundle: input.controller.toBundle(),
    dirty: input.controller.snapshot.dirtyBreakpoints,
    baseRevision: input.baseRevision ?? null,
    conflict: input.hasUnresolvedConflict === true,
    capabilities: {
      revisionSync: input.capabilities.revisionSync,
      contractVersion: responsive.contractVersion ?? null,
      contractCompatible: responsive.contractCompatible,
      read: responsive.read,
      write: responsive.write,
      atomicRevision: responsive.atomicRevision,
      breakpoints: [...responsive.breakpoints].sort(),
    },
  });
}

export class ResponsiveCanvasV2SavePreviewSession {
  private cachedKey?: string;
  private cachedPreview?: ResponsiveCanvasV2SavePreview;

  constructor(
    private readonly clientId: string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  preview(input: ResponsiveCanvasV2SavePreviewSessionInput): ResponsiveCanvasV2SavePreview {
    const key = fingerprint(input);
    if (key === this.cachedKey && this.cachedPreview) return this.cachedPreview;

    const preview = createResponsiveCanvasV2SavePreview(
      input.controller,
      input.capabilities,
      this.clientId,
      input.baseRevision,
      {
        now: this.now(),
        hasUnresolvedConflict: input.hasUnresolvedConflict,
      },
    );
    this.cachedKey = key;
    this.cachedPreview = preview;
    return preview;
  }

  invalidate(): void {
    this.cachedKey = undefined;
    this.cachedPreview = undefined;
  }
}
