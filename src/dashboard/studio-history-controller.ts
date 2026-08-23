import { DashboardHistory } from './layout-history';
import type { FrakonDashboardDocument } from './layout-model';

export type StudioHistoryChangeSource =
  | 'appearance'
  | 'constraints'
  | 'constraint-preview'
  | 'move'
  | 'resize'
  | 'auto-layout'
  | 'external';

export interface StudioHistorySnapshot {
  document: FrakonDashboardDocument;
  preview?: FrakonDashboardDocument;
  canUndo: boolean;
  canRedo: boolean;
  previewActive: boolean;
  lastSource?: StudioHistoryChangeSource;
}

/**
 * Coordinates committed dashboard history and temporary visual previews.
 * Preview documents never enter undo/redo history until commitPreview() is called.
 */
export class StudioHistoryController {
  private readonly history: DashboardHistory;
  private previewDocument?: FrakonDashboardDocument;
  private previewSource?: StudioHistoryChangeSource;
  private lastSource?: StudioHistoryChangeSource;

  constructor(initial: FrakonDashboardDocument, limit = 50) {
    this.history = new DashboardHistory(structuredClone(initial), limit);
  }

  get committed(): FrakonDashboardDocument {
    return this.history.value;
  }

  get visible(): FrakonDashboardDocument {
    return this.previewDocument ?? this.history.value;
  }

  get previewActive(): boolean {
    return this.previewDocument !== undefined;
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  snapshot(): StudioHistorySnapshot {
    return {
      document: structuredClone(this.history.value),
      preview: this.previewDocument ? structuredClone(this.previewDocument) : undefined,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
      previewActive: this.previewActive,
      lastSource: this.lastSource,
    };
  }

  push(document: FrakonDashboardDocument, source: StudioHistoryChangeSource = 'external'): FrakonDashboardDocument {
    this.clearPreview();
    this.lastSource = source;
    return this.history.push(structuredClone(document));
  }

  beginPreview(
    document: FrakonDashboardDocument,
    source: StudioHistoryChangeSource = 'constraint-preview',
  ): FrakonDashboardDocument {
    this.previewDocument = structuredClone(document);
    this.previewSource = source;
    return this.previewDocument;
  }

  updatePreview(document: FrakonDashboardDocument): FrakonDashboardDocument {
    if (!this.previewDocument) throw new Error('Cannot update Studio preview before beginPreview().');
    this.previewDocument = structuredClone(document);
    return this.previewDocument;
  }

  commitPreview(): FrakonDashboardDocument {
    if (!this.previewDocument) return this.history.value;
    const next = this.previewDocument;
    const source = this.previewSource ?? 'constraint-preview';
    this.previewDocument = undefined;
    this.previewSource = undefined;
    this.lastSource = source;
    return this.history.push(next);
  }

  cancelPreview(): FrakonDashboardDocument {
    this.clearPreview();
    return this.history.value;
  }

  undo(): FrakonDashboardDocument {
    this.clearPreview();
    this.lastSource = 'external';
    return this.history.undo();
  }

  redo(): FrakonDashboardDocument {
    this.clearPreview();
    this.lastSource = 'external';
    return this.history.redo();
  }

  replace(document: FrakonDashboardDocument): FrakonDashboardDocument {
    this.clearPreview();
    this.lastSource = 'external';
    return this.history.replace(structuredClone(document));
  }

  private clearPreview(): void {
    this.previewDocument = undefined;
    this.previewSource = undefined;
  }
}
