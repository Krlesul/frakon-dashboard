import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardV2DraftHistorySnapshot {
  document: FrakonDashboardDocumentV2;
  canUndo: boolean;
  canRedo: boolean;
}

export class DashboardV2DraftHistory {
  private past: FrakonDashboardDocumentV2[] = [];
  private future: FrakonDashboardDocumentV2[] = [];
  private current: FrakonDashboardDocumentV2;

  constructor(initial: FrakonDashboardDocumentV2, private readonly limit = 50) {
    this.current = structuredClone(initial);
  }

  get value(): FrakonDashboardDocumentV2 {
    return structuredClone(this.current);
  }

  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  snapshot(): DashboardV2DraftHistorySnapshot {
    return { document: this.value, canUndo: this.canUndo, canRedo: this.canRedo };
  }

  push(next: FrakonDashboardDocumentV2): FrakonDashboardDocumentV2 {
    if (JSON.stringify(next) === JSON.stringify(this.current)) return this.value;
    this.past.push(structuredClone(this.current));
    if (this.past.length > this.limit) this.past.shift();
    this.current = structuredClone(next);
    this.future = [];
    return this.value;
  }

  undo(): FrakonDashboardDocumentV2 {
    const previous = this.past.pop();
    if (!previous) return this.value;
    this.future.push(structuredClone(this.current));
    this.current = previous;
    return this.value;
  }

  redo(): FrakonDashboardDocumentV2 {
    const next = this.future.pop();
    if (!next) return this.value;
    this.past.push(structuredClone(this.current));
    this.current = next;
    return this.value;
  }

  reset(document: FrakonDashboardDocumentV2): FrakonDashboardDocumentV2 {
    this.current = structuredClone(document);
    this.past = [];
    this.future = [];
    return this.value;
  }
}
