import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { resolveResponsiveCanvasV2Conflicts, type ResponsiveCanvasV2ConflictSelections } from './responsive-v2-conflict-resolution';
import { mergeResponsiveCanvasV2Bundles, type ResponsiveCanvasV2MergeResult } from './responsive-v2-merge';
import { persistResponsiveCanvasV2Revision } from './responsive-v2-persistence';
import { recoverResponsiveCanvasV2ReadOnly } from './responsive-v2-recovery';
import { createResponsiveCanvasV2Revision, type ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

export interface ResponsiveCanvasV2ConflictSession {
  base: ResponsiveCanvasV2RevisionEnvelope;
  local: ResponsiveCanvasV2RevisionEnvelope;
  remote: ResponsiveCanvasV2RevisionEnvelope;
  merge: ResponsiveCanvasV2MergeResult;
}

export interface ResponsiveCanvasV2SyncState {
  loading: boolean;
  saving: boolean;
  capabilities?: DashboardServerCapabilities;
  envelope?: ResponsiveCanvasV2RevisionEnvelope;
  controller?: ResponsiveV2DraftController;
  conflict?: ResponsiveCanvasV2ConflictSession;
  error?: Error;
}

export class ResponsiveCanvasV2SyncController {
  private state: ResponsiveCanvasV2SyncState = { loading: false, saving: false };
  private baseEnvelope?: ResponsiveCanvasV2RevisionEnvelope;

  constructor(
    private readonly transport: DashboardStorageTransport,
    private readonly clientId: string,
    private readonly namespace = 'frakon/dashboard',
    private readonly now: () => number = Date.now,
  ) {}

  get currentState(): ResponsiveCanvasV2SyncState {
    return { ...this.state };
  }

  async load(id: string): Promise<ResponsiveV2DraftController | undefined> {
    this.patch({ loading: true, error: undefined, conflict: undefined });
    try {
      const recovered = await recoverResponsiveCanvasV2ReadOnly(this.transport, id, this.namespace);
      this.patch({ capabilities: recovered.capabilities });
      if (recovered.status !== 'recovered') {
        this.patch({
          error: recovered.status === 'blocked'
            ? new Error('Responsive canvas reads are disabled by server capabilities.')
            : recovered.status === 'invalid'
              ? new Error(`Responsive canvas recovery failed: ${recovered.reason}.`)
              : undefined,
          controller: undefined,
          envelope: undefined,
        });
        return undefined;
      }
      this.baseEnvelope = recovered.envelope;
      this.patch({ envelope: recovered.envelope, controller: recovered.controller, error: undefined });
      return recovered.controller;
    } catch (error) {
      this.patch({ error: toError(error) });
      return undefined;
    } finally {
      this.patch({ loading: false });
    }
  }

  async save(): Promise<ResponsiveCanvasV2RevisionEnvelope | undefined> {
    const controller = this.state.controller;
    const capabilities = this.state.capabilities;
    if (!controller || !capabilities) return undefined;
    const local = createResponsiveCanvasV2Revision(controller.toBundle(), this.clientId, this.state.envelope, this.now());
    this.patch({ saving: true, error: undefined });
    try {
      const result = await persistResponsiveCanvasV2Revision(
        this.transport,
        capabilities,
        local,
        this.state.envelope?.revision,
        this.namespace,
      );
      if (result.status === 'blocked') {
        this.patch({ error: new Error(`Responsive canvas persistence blocked: ${result.reason}.`), conflict: undefined });
        return undefined;
      }
      if (result.status === 'saved') {
        this.accept(result.envelope);
        return result.envelope;
      }
      const base = this.baseEnvelope ?? this.state.envelope;
      if (!base) throw new Error('Responsive canvas conflict cannot be resolved without a common base revision.');
      this.patch({
        conflict: {
          base,
          local,
          remote: result.remote,
          merge: mergeResponsiveCanvasV2Bundles(base.bundle, local.bundle, result.remote.bundle),
        },
      });
      return undefined;
    } catch (error) {
      this.patch({ error: toError(error) });
      return undefined;
    } finally {
      this.patch({ saving: false });
    }
  }

  async resolveConflict(
    selections: ResponsiveCanvasV2ConflictSelections,
  ): Promise<ResponsiveCanvasV2RevisionEnvelope | undefined> {
    const conflict = this.state.conflict;
    const capabilities = this.state.capabilities;
    if (!conflict || !capabilities) return this.state.envelope;
    const resolution = resolveResponsiveCanvasV2Conflicts({
      merged: conflict.merge.bundle,
      local: conflict.local.bundle,
      remote: conflict.remote.bundle,
      conflicts: conflict.merge.conflicts,
      selections,
    });
    if (resolution.status !== 'resolved') {
      this.patch({ error: new Error(`Responsive canvas conflict is incomplete: ${resolution.unresolved.join(', ')}.`) });
      return undefined;
    }
    const resolved = createResponsiveCanvasV2Revision(
      resolution.bundle,
      this.clientId,
      conflict.remote,
      this.now(),
    );
    this.patch({ saving: true, error: undefined });
    try {
      const result = await persistResponsiveCanvasV2Revision(
        this.transport,
        capabilities,
        resolved,
        conflict.remote.revision,
        this.namespace,
      );
      if (result.status !== 'saved') {
        throw new Error(result.status === 'blocked'
          ? `Responsive canvas persistence blocked: ${result.reason}.`
          : 'Responsive canvas changed again while resolving the conflict. Reload and try again.');
      }
      this.accept(result.envelope);
      return result.envelope;
    } catch (error) {
      this.patch({ error: toError(error) });
      return undefined;
    } finally {
      this.patch({ saving: false });
    }
  }

  private accept(envelope: ResponsiveCanvasV2RevisionEnvelope): void {
    this.baseEnvelope = envelope;
    this.patch({
      envelope,
      controller: ResponsiveV2DraftController.fromBundle(envelope.bundle),
      conflict: undefined,
      error: undefined,
    });
  }

  private patch(patch: Partial<ResponsiveCanvasV2SyncState>): void {
    this.state = { ...this.state, ...patch };
  }
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
