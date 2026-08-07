import {
  createDashboardV2ConflictSession,
  resolveDashboardV2ConflictSelections,
  resolveDashboardV2ConflictSession,
  type DashboardV2ConflictChoice,
  type DashboardV2ConflictSession,
} from './dashboard-conflict-coordinator-v2';
import type { DashboardConflictSelections } from './dashboard-selective-conflict-resolution';
import type { DashboardLayoutCapabilities } from './dashboard-layout-version-policy';
import type { DashboardRevisionEnvelope } from './dashboard-revision';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { RevisionedDashboardStorage } from './revisioned-dashboard-storage';

export interface RevisionedDashboardV2SyncState {
  loading: boolean;
  saving: boolean;
  envelope?: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>;
  conflict?: DashboardV2ConflictSession;
  error?: Error;
}

export type RevisionedDashboardV2SyncListener = (state: RevisionedDashboardV2SyncState) => void;

export class RevisionedDashboardV2SyncController {
  private state: RevisionedDashboardV2SyncState = { loading: false, saving: false };
  private baseEnvelope?: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>;
  private readonly listeners = new Set<RevisionedDashboardV2SyncListener>();

  constructor(
    private readonly storage: RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
    private readonly capabilities: DashboardLayoutCapabilities,
    private readonly clientId: string,
    private readonly now: () => number = Date.now,
  ) {}

  get currentState(): RevisionedDashboardV2SyncState {
    return structuredClone(this.state);
  }

  subscribe(listener: RevisionedDashboardV2SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  async load(id: string): Promise<DashboardRevisionEnvelope<FrakonDashboardDocumentV2> | undefined> {
    if (!this.capabilities.readV2) {
      this.patchState({ error: new Error('Dashboard version 2 reads are disabled.'), conflict: undefined });
      return undefined;
    }

    this.patchState({ loading: true, error: undefined, conflict: undefined });
    try {
      const envelope = await this.storage.load(id);
      if (envelope && envelope.document.version !== 2) {
        throw new Error(`Expected dashboard version 2 but received version ${envelope.document.version}.`);
      }
      this.baseEnvelope = envelope;
      this.patchState({ envelope });
      return envelope;
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    } finally {
      this.patchState({ loading: false });
    }
  }

  async save(
    document: FrakonDashboardDocumentV2,
  ): Promise<DashboardRevisionEnvelope<FrakonDashboardDocumentV2> | undefined> {
    if (!this.capabilities.writeV2) {
      this.patchState({ error: new Error('Dashboard version 2 writes are disabled.'), conflict: undefined });
      return undefined;
    }

    this.patchState({ saving: true, error: undefined });
    try {
      const result = await this.storage.save(document, this.state.envelope);
      if (result.status === 'saved' && result.envelope) {
        this.acceptEnvelope(result.envelope);
        return result.envelope;
      }
      if (result.status === 'blocked') {
        this.patchState({ conflict: undefined, error: new Error('Dashboard version 2 persistence was blocked by storage policy.') });
        return undefined;
      }
      if (!result.comparison) throw new Error('Version 2 revision conflict response did not include comparison data.');
      const base = this.baseEnvelope ?? this.state.envelope;
      if (!base) throw new Error('Cannot resolve a version 2 dashboard conflict without a common base revision.');
      this.patchState({ conflict: createDashboardV2ConflictSession(result.comparison, base) });
      return undefined;
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    } finally {
      this.patchState({ saving: false });
    }
  }

  async resolveConflict(
    choice: DashboardV2ConflictChoice,
  ): Promise<DashboardRevisionEnvelope<FrakonDashboardDocumentV2> | undefined> {
    const conflict = this.state.conflict;
    if (!conflict) return this.state.envelope;
    if (!this.capabilities.writeV2) {
      this.patchState({ error: new Error('Dashboard version 2 writes are disabled.'), conflict });
      return undefined;
    }
    const resolved = resolveDashboardV2ConflictSession(conflict, choice, this.clientId, this.now());
    return this.persistResolvedConflict(conflict, resolved);
  }

  async resolveConflictSelections(
    selections: DashboardConflictSelections,
  ): Promise<DashboardRevisionEnvelope<FrakonDashboardDocumentV2> | undefined> {
    const conflict = this.state.conflict;
    if (!conflict) return this.state.envelope;
    if (!this.capabilities.writeV2) {
      this.patchState({ error: new Error('Dashboard version 2 writes are disabled.'), conflict });
      return undefined;
    }
    try {
      const resolved = resolveDashboardV2ConflictSelections(conflict, selections, this.clientId, this.now());
      return await this.persistResolvedConflict(conflict, resolved);
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    }
  }

  private async persistResolvedConflict(
    conflict: DashboardV2ConflictSession,
    resolved: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>,
  ): Promise<DashboardRevisionEnvelope<FrakonDashboardDocumentV2> | undefined> {
    this.patchState({ saving: true, error: undefined });
    try {
      const result = await this.storage.save(resolved.document, conflict.comparison.remote);
      if (result.status === 'blocked') {
        throw new Error('Dashboard version 2 persistence became disabled while resolving the conflict.');
      }
      if (result.status !== 'saved' || !result.envelope) {
        throw new Error('Dashboard changed again while resolving the version 2 conflict. Reload and try again.');
      }
      this.acceptEnvelope(result.envelope);
      return result.envelope;
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    } finally {
      this.patchState({ saving: false });
    }
  }

  private acceptEnvelope(envelope: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>): void {
    this.baseEnvelope = envelope;
    this.patchState({ envelope, conflict: undefined });
  }

  private patchState(patch: Partial<RevisionedDashboardV2SyncState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
