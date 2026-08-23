import type { FrakonCanvasV2DraftDetail } from './canvas-v2-view';
import { DashboardV2DraftHistory } from './dashboard-v2-draft-history';
import { keyboardNudgeDeltaV2, nudgeDashboardV2Selection } from './dashboard-keyboard-nudge-v2';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardV2DraftSnapshot {
  document: FrakonDashboardDocumentV2;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export class DashboardV2DraftController {
  private base: FrakonDashboardDocumentV2;
  private history: DashboardV2DraftHistory;

  constructor(document: FrakonDashboardDocumentV2) {
    this.base = structuredClone(document);
    this.history = new DashboardV2DraftHistory(document);
  }

  get snapshot(): DashboardV2DraftSnapshot {
    const state = this.history.snapshot();
    return {
      ...state,
      dirty: JSON.stringify(state.document) !== JSON.stringify(this.base),
    };
  }

  apply(result: FrakonCanvasV2DraftDetail): DashboardV2DraftSnapshot {
    if (result.status === 'committed') this.history.push(result.document);
    return this.snapshot;
  }

  nudge(selectedIds: Iterable<string>, key: string, shiftKey = false): FrakonCanvasV2DraftDetail | undefined {
    const current = this.history.value;
    const delta = keyboardNudgeDeltaV2(key, current.layout.snap.size, shiftKey);
    if (!delta) return undefined;
    const result = nudgeDashboardV2Selection(current, selectedIds, delta);
    const detail: FrakonCanvasV2DraftDetail = {
      status: result.status === 'moved' ? 'committed' : result.status,
      document: result.document,
      collisionIds: result.collisionIds,
    };
    this.apply(detail);
    return detail;
  }

  undo(): DashboardV2DraftSnapshot {
    this.history.undo();
    return this.snapshot;
  }

  redo(): DashboardV2DraftSnapshot {
    this.history.redo();
    return this.snapshot;
  }

  reset(document = this.base): DashboardV2DraftSnapshot {
    this.base = structuredClone(document);
    this.history.reset(document);
    return this.snapshot;
  }
}
