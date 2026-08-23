import type { FrakonDashboardDocument } from './layout-model';

export class DashboardHistory {
  private past: FrakonDashboardDocument[] = [];
  private future: FrakonDashboardDocument[] = [];

  constructor(private current: FrakonDashboardDocument, private readonly limit = 50) {}

  get value(): FrakonDashboardDocument { return this.current; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  push(next: FrakonDashboardDocument): FrakonDashboardDocument {
    if (JSON.stringify(next) === JSON.stringify(this.current)) return this.current;
    this.past.push(this.current);
    if (this.past.length > this.limit) this.past.shift();
    this.current = next;
    this.future = [];
    return this.current;
  }

  replace(next: FrakonDashboardDocument): FrakonDashboardDocument {
    this.current = next;
    this.past = [];
    this.future = [];
    return this.current;
  }

  undo(): FrakonDashboardDocument {
    const previous = this.past.pop();
    if (!previous) return this.current;
    this.future.push(this.current);
    this.current = previous;
    return this.current;
  }

  redo(): FrakonDashboardDocument {
    const next = this.future.pop();
    if (!next) return this.current;
    this.past.push(this.current);
    this.current = next;
    return this.current;
  }
}
