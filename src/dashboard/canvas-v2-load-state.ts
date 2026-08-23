import type { CanvasV2LoadChainResult } from './canvas-v2-load-chain';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import type { ResponsiveV2DraftSnapshot } from './responsive-v2-draft-controller';

export interface CanvasV2EditorLoadState {
  mode: 'responsive' | 'single-v2';
  revision: string;
  controller: ResponsiveV2DraftController;
  snapshot: ResponsiveV2DraftSnapshot;
}

export function canvasV2EditorLoadState(
  result: CanvasV2LoadChainResult,
): CanvasV2EditorLoadState | undefined {
  if (result.status === 'responsive') {
    const controller = ResponsiveV2DraftController.fromBundle(result.envelope.bundle);
    return {
      mode: 'responsive',
      revision: result.envelope.revision,
      controller,
      snapshot: controller.snapshot,
    };
  }

  if (result.status === 'single-v2') {
    const document = result.envelope.document;
    const controller = new ResponsiveV2DraftController(document, document.breakpoint);
    return {
      mode: 'single-v2',
      revision: result.envelope.revision,
      controller,
      snapshot: controller.snapshot,
    };
  }

  return undefined;
}
