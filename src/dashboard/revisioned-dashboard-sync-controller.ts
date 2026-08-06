import {
  createDashboardConflictSession,
  resolveDashboardConflictSelections,
  resolveDashboardConflictSession,
  type DashboardConflictChoice,
  type DashboardConflictSession,
} from './dashboard-conflict-coordinator';
import type { DashboardConflictSelections } from './dashboard-selective-conflict-resolution';
import type { DashboardRevisionEnvelope } from './dashboard-revision';
import type { FrakonDashboardDocument } from './layout-model';
import type { RevisionedDashboardStorage } from './revisioned-dashboard-storage';

export interface RevisionedDashboardSyncState {
  loading: boolean;
  saving: boolean;
  envelope?: DashboardRevisionEnvelope;
  conflict?: DashboardConflictSession;
  error?: Error;
}

export type RevisionedDashboardSyncListener = (state: RevisionedDashboardSyncState) => void;

export class RevisionedDashboardSyncController {
  private state: RevisionedDashboardSyncState = { loading: false, saving: false };
  private baseEnvelope?: DashboardRevisionEnvelope;
  private readonly listeners = new Set<RevisionedDashboardSyncListener>();

  constructor(
    private readonly storage: RevisionedDashboardStorage,
    private readonly clientId: string,
    private readonly now: () => number = Date.now,
  ) {}

  get currentState(): RevisionedDashboardSyncState {
    return structuredClone(this.state);
  }

  subscribe(listener: RevisionedDashboardSyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  async load(id: string): Promise<DashboardRevisionEnvelope | undefined> {
    this.patchState({ loading: true, error: undefined, conflict: undefined });
    try {
      const envelope = await this.storage.load(id);
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

  async save(document: FrakonDashboardDocument): Promise<DashboardRevisionEnvelope | undefined> {
    this.patchState({ saving: true, error: undefined });
    try {
      const result = await this.storage.save(document, this.state.envelope);
      if (result.status === 'saved' && result.envelope) {
        this.acceptEnvelope(result.envelope);
        return result.envelope;
      }

      if (!result.comparison) throw new Error('Revision conflict response did not include comparison data.');
      const base = this.baseEnvelope ?? this.state.envelope;
      if (!base) throw new Error('Cannot resolve a dashboard conflict without a common base revision.');
      this.patchState({ conflict: createDashboardConflictSession(result.comparison, base) });
      return undefined;
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    } finally {
      this.patchState({ saving: false });
    }
  }

  async resolveConflict(choice: DashboardConflictChoice): Promise<DashboardRevisionEnvelope | undefined> {
    const conflict = this.state.conflict;
    if (!conflict) return this.state.envelope;
    const resolved = resolveDashboardConflictSession(conflict, choice, this.clientId, this.now());
    return this.persistResolvedConflict(conflict, resolved);
  }

  async resolveConflictSelections(
    selections: DashboardConflictSelections,
  ): Promise<DashboardRevisionEnvelope | undefined> {
    const conflict = this.state.conflict;
    if (!conflict) return this.state.envelope;
    try {
      const resolved = resolveDashboardConflictSelections(conflict, selections, this.clientId, this.now());
      return await this.persistResolvedConflict(conflict, resolved);
    } catch (error) {
      this.patchState({ error: toError(error) });
      return undefined;
    }
  }

  private async persistResolvedConflict(
    conflict: DashboardConflictSession,
    resolved: DashboardRevisionEnvelope,
  ): Promise<DashboardRevisionEnvelope | undefined> {
    this.patchState({ saving: true, error: undefined });
    try {
      const result = await this.storage.save(resolved.document, conflict.comparison.remote);
      if (result.status !== 'saved' || !result.envelope) {
        throw new Error('Dashboard changed again while resolving the conflict. Reload and try again.');
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

  private acceptEnvelope(envelope: DashboardRevisionEnvelope): void {
    this.baseEnvelope = envelope;
    this.patchState({ envelope, conflict: undefined });
  }

  private patchState(patch: Partial<RevisionedDashboardSyncState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
