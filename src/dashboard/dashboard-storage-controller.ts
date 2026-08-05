import { normalizeAndCompactDashboard, type FrakonDashboardDocument } from './layout-model';
import type { DashboardStorageAdapter } from './dashboard-storage';

export interface DashboardStorageControllerState {
  loading: boolean;
  saving: boolean;
  error?: Error;
}

export type DashboardStorageControllerListener = (state: DashboardStorageControllerState) => void;

export class DashboardStorageController {
  private state: DashboardStorageControllerState = { loading: false, saving: false };
  private loadGeneration = 0;
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<DashboardStorageControllerListener>();

  constructor(private readonly adapter: DashboardStorageAdapter) {}

  get adapterKind(): string {
    return this.adapter.kind;
  }

  get currentState(): DashboardStorageControllerState {
    return { ...this.state };
  }

  subscribe(listener: DashboardStorageControllerListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const generation = ++this.loadGeneration;
    this.patchState({ loading: true, error: undefined });
    try {
      const document = await this.adapter.load(id);
      if (generation !== this.loadGeneration) return undefined;
      return document ? normalizeAndCompactDashboard(document) : undefined;
    } catch (error) {
      if (generation === this.loadGeneration) this.patchState({ error: toError(error) });
      return undefined;
    } finally {
      if (generation === this.loadGeneration) this.patchState({ loading: false });
    }
  }

  save(document: FrakonDashboardDocument): Promise<void> {
    const normalized = normalizeAndCompactDashboard(document);
    this.patchState({ saving: true, error: undefined });
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.adapter.save(normalized))
      .catch((error) => {
        this.patchState({ error: toError(error) });
      })
      .finally(() => {
        this.patchState({ saving: false });
      });
    return this.saveQueue;
  }

  async remove(id: string): Promise<void> {
    this.loadGeneration += 1;
    this.patchState({ saving: true, error: undefined });
    try {
      await this.adapter.remove(id);
    } catch (error) {
      this.patchState({ error: toError(error) });
    } finally {
      this.patchState({ saving: false, loading: false });
    }
  }

  private patchState(patch: Partial<DashboardStorageControllerState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
