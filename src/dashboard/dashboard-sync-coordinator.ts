import type { ResilientDashboardStorageAdapter } from './resilient-dashboard-storage';

export interface DashboardConnectivitySource {
  subscribe(listener: (online: boolean) => void): () => void;
  readonly online: boolean;
}

export class BrowserDashboardConnectivitySource implements DashboardConnectivitySource {
  constructor(private readonly target: Window | undefined = globalThis.window) {}

  get online(): boolean {
    return globalThis.navigator?.onLine ?? true;
  }

  subscribe(listener: (online: boolean) => void): () => void {
    if (!this.target) return () => undefined;
    const onOnline = () => listener(true);
    const onOffline = () => listener(false);
    this.target.addEventListener('online', onOnline);
    this.target.addEventListener('offline', onOffline);
    return () => {
      this.target?.removeEventListener('online', onOnline);
      this.target?.removeEventListener('offline', onOffline);
    };
  }
}

export interface DashboardSyncCoordinatorState {
  online: boolean;
  syncing: boolean;
  pending: number;
}

export type DashboardSyncCoordinatorListener = (state: DashboardSyncCoordinatorState) => void;

export class DashboardSyncCoordinator {
  private readonly listeners = new Set<DashboardSyncCoordinatorListener>();
  private unsubscribeConnectivity?: () => void;
  private unsubscribeStorage?: () => void;
  private state: DashboardSyncCoordinatorState;
  private syncPromise?: Promise<void>;

  constructor(
    private readonly storage: ResilientDashboardStorageAdapter,
    private readonly connectivity: DashboardConnectivitySource = new BrowserDashboardConnectivitySource(),
  ) {
    this.state = {
      online: connectivity.online,
      syncing: storage.currentState.syncing,
      pending: storage.currentState.pending,
    };
  }

  get currentState(): DashboardSyncCoordinatorState {
    return { ...this.state };
  }

  subscribe(listener: DashboardSyncCoordinatorListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.unsubscribeConnectivity) return;
    this.unsubscribeStorage = this.storage.subscribe((storageState) => {
      this.patchState({ syncing: storageState.syncing, pending: storageState.pending });
    });
    this.unsubscribeConnectivity = this.connectivity.subscribe((online) => {
      this.patchState({ online });
      if (online) void this.synchronize();
    });
    if (this.connectivity.online && this.storage.currentState.pending > 0) void this.synchronize();
  }

  stop(): void {
    this.unsubscribeConnectivity?.();
    this.unsubscribeStorage?.();
    this.unsubscribeConnectivity = undefined;
    this.unsubscribeStorage = undefined;
  }

  synchronize(): Promise<void> {
    if (!this.connectivity.online) return Promise.resolve();
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.storage.synchronize().finally(() => {
      this.syncPromise = undefined;
    });
    return this.syncPromise;
  }

  private patchState(patch: Partial<DashboardSyncCoordinatorState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}
