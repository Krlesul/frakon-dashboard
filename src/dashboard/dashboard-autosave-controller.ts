import type { FrakonDashboardDocument } from './layout-model';
import type {
  DashboardStorageController,
  DashboardStorageControllerState,
} from './dashboard-storage-controller';

export interface DashboardAutosaveState {
  pending: boolean;
  saving: boolean;
  lastSavedAt?: number;
  error?: Error;
}

export type DashboardAutosaveListener = (state: DashboardAutosaveState) => void;

/**
 * Debounces committed Studio changes before forwarding them to storage.
 * Only the newest pending document is retained while an earlier save is running.
 */
export class DashboardAutosaveController {
  private state: DashboardAutosaveState = { pending: false, saving: false };
  private pendingDocument?: FrakonDashboardDocument;
  private timer?: ReturnType<typeof setTimeout>;
  private flushQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<DashboardAutosaveListener>();
  private readonly unsubscribeStorage: () => void;

  constructor(
    private readonly storage: DashboardStorageController,
    private readonly delayMs = 650,
  ) {
    this.unsubscribeStorage = storage.subscribe((storageState) => this.onStorageState(storageState));
  }

  get currentState(): DashboardAutosaveState {
    return { ...this.state };
  }

  subscribe(listener: DashboardAutosaveListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  schedule(document: FrakonDashboardDocument): void {
    this.pendingDocument = structuredClone(document);
    this.patchState({ pending: true, error: undefined });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.delayMs);
  }

  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.flushQueue = this.flushQueue.then(async () => {
      while (this.pendingDocument) {
        const document = this.pendingDocument;
        this.pendingDocument = undefined;
        this.patchState({ pending: false, saving: true, error: undefined });
        await this.storage.save(document);
        const storageState = this.storage.currentState;
        if (storageState.error) {
          this.patchState({ saving: false, error: storageState.error });
          return;
        }
        this.patchState({
          saving: false,
          pending: Boolean(this.pendingDocument),
          lastSavedAt: Date.now(),
          error: undefined,
        });
      }
    });

    return this.flushQueue;
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.pendingDocument = undefined;
    this.patchState({ pending: false });
  }

  dispose(): void {
    this.cancel();
    this.unsubscribeStorage();
    this.listeners.clear();
  }

  private onStorageState(storageState: DashboardStorageControllerState): void {
    this.patchState({
      saving: storageState.saving || this.state.saving,
      error: storageState.error,
    });
  }

  private patchState(patch: Partial<DashboardAutosaveState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}
