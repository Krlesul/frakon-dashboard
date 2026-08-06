import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DashboardAutosaveController,
  type DashboardAutosaveState,
} from '../../../src/dashboard/dashboard-autosave-controller';
import type { DashboardConflictChoice } from '../../../src/dashboard/dashboard-conflict-coordinator';
import type { DashboardStorageController } from '../../../src/dashboard/dashboard-storage-controller';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type {
  ResilientDashboardStorageAdapter,
  ResilientDashboardStorageState,
} from '../../../src/dashboard/resilient-dashboard-storage';
import type {
  RevisionedDashboardSyncController,
  RevisionedDashboardSyncState,
} from '../../../src/dashboard/revisioned-dashboard-sync-controller';
import type { FrakonDashboardConflictResolvedDetail } from './dashboard-conflict-panel';
import type { FrakonDetailedConflictResolvedDetail } from './dashboard-detailed-conflict-panel';
import type { FrakonHistoryStudioChangedDetail } from './dashboard-studio-history';
import './dashboard-conflict-panel';
import './dashboard-detailed-conflict-panel';
import './dashboard-studio-history';

export interface FrakonStorageStudioChangedDetail {
  document: FrakonDashboardDocument;
  saved: boolean;
}

@customElement('frakon-dashboard-studio-storage')
export class FrakonDashboardStudioStorage extends LitElement {
  @property({ attribute: false }) controller?: DashboardStorageController;
  @property({ attribute: false }) resilientStorage?: ResilientDashboardStorageAdapter;
  @property({ attribute: false }) revisionController?: RevisionedDashboardSyncController;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property() dashboardId = '';
  @property({ type: Number }) autosaveDelay = 650;

  @state() private activeDocument?: FrakonDashboardDocument;
  @state() private loading = false;
  @state() private autosaveState: DashboardAutosaveState = { pending: false, saving: false };
  @state() private resilientState?: ResilientDashboardStorageState;
  @state() private revisionState?: RevisionedDashboardSyncState;

  private autosave?: DashboardAutosaveController;
  private unsubscribeAutosave?: () => void;
  private unsubscribeResilient?: () => void;
  private unsubscribeRevision?: () => void;
  private loadGeneration = 0;

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:10px; }
    .storage-bar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:9px 12px;
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:12px;
      background:rgb(255 255 255 / 5%);
      font:500 12px/1.3 Inter,system-ui,sans-serif;
    }
    .status { display:flex; align-items:center; gap:8px; min-width:0; }
    .dot { width:8px; height:8px; border-radius:999px; background:#8b97aa; flex:0 0 auto; }
    .dot.pending,.dot.fallback,.dot.conflict { background:#ffcf66; }
    .dot.saving,.dot.syncing { background:#69a7ff; box-shadow:0 0 0 4px rgb(105 167 255 / 12%); }
    .dot.saved { background:#5fd39a; }
    .dot.error { background:#ff5c72; }
    .label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
    .conflict-stack { display:grid; gap:10px; }
    button {
      border:1px solid rgb(255 255 255 / 12%);
      border-radius:9px;
      padding:7px 10px;
      color:inherit;
      background:rgb(255 255 255 / 6%);
      cursor:pointer;
      font:inherit;
    }
    button:disabled { opacity:.45; cursor:not-allowed; }
    .error { color:#ff9aac; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('pagehide', this.pagehideListener);
  }

  disconnectedCallback(): void {
    window.removeEventListener('pagehide', this.pagehideListener);
    void this.autosave?.flush();
    this.disposeAutosave();
    this.disposeResilientSubscription();
    this.disposeRevisionSubscription();
    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('controller') || changed.has('autosaveDelay') || changed.has('revisionController')) {
      this.configureAutosave();
    }
    if (changed.has('resilientStorage')) this.configureResilientSubscription();
    if (changed.has('revisionController')) this.configureRevisionSubscription();
    if (changed.has('document') && this.document) this.activeDocument = structuredClone(this.document);
    if ((changed.has('controller') || changed.has('revisionController') || changed.has('dashboardId')) && this.dashboardId) {
      void this.loadDocument();
    }
  }

  private readonly pagehideListener = (): void => {
    void this.autosave?.flush();
  };

  private configureAutosave(): void {
    this.disposeAutosave();
    if (!this.controller || this.revisionController) return;
    this.autosave = new DashboardAutosaveController(this.controller, this.autosaveDelay);
    this.unsubscribeAutosave = this.autosave.subscribe((state) => {
      this.autosaveState = state;
      if (state.lastSavedAt && this.activeDocument) this.emitChanged(true);
    });
  }

  private configureResilientSubscription(): void {
    this.disposeResilientSubscription();
    if (!this.resilientStorage) {
      this.resilientState = undefined;
      return;
    }
    this.unsubscribeResilient = this.resilientStorage.subscribe((state) => {
      this.resilientState = state;
    });
  }

  private configureRevisionSubscription(): void {
    this.disposeRevisionSubscription();
    if (!this.revisionController) {
      this.revisionState = undefined;
      return;
    }
    this.unsubscribeRevision = this.revisionController.subscribe((state) => {
      this.revisionState = state;
      if (state.envelope && !state.conflict) {
        this.activeDocument = structuredClone(state.envelope.document);
        this.document = structuredClone(state.envelope.document);
      }
    });
  }

  private disposeAutosave(): void {
    this.unsubscribeAutosave?.();
    this.unsubscribeAutosave = undefined;
    this.autosave?.dispose();
    this.autosave = undefined;
  }

  private disposeResilientSubscription(): void {
    this.unsubscribeResilient?.();
    this.unsubscribeResilient = undefined;
  }

  private disposeRevisionSubscription(): void {
    this.unsubscribeRevision?.();
    this.unsubscribeRevision = undefined;
  }

  private async loadDocument(): Promise<void> {
    if (!this.dashboardId) return;
    const generation = ++this.loadGeneration;
    this.loading = true;
    const revisionEnvelope = this.revisionController
      ? await this.revisionController.load(this.dashboardId)
      : undefined;
    const loaded = revisionEnvelope?.document
      ?? (this.controller ? await this.controller.load(this.dashboardId) : undefined);
    if (generation !== this.loadGeneration) return;
    if (loaded) {
      this.activeDocument = structuredClone(loaded);
      this.document = structuredClone(loaded);
    }
    this.loading = false;
  }

  private onHistoryChanged(event: CustomEvent<FrakonHistoryStudioChangedDetail>): void {
    this.activeDocument = event.detail.document;
    this.document = structuredClone(event.detail.document);
    if (this.revisionController) void this.saveRevision(event.detail.document);
    else this.autosave?.schedule(event.detail.document);
    this.emitChanged(false);
  }

  private async saveRevision(document: FrakonDashboardDocument): Promise<void> {
    const saved = await this.revisionController?.save(document);
    if (saved) {
      this.activeDocument = structuredClone(saved.document);
      this.document = structuredClone(saved.document);
      this.emitChanged(true);
    }
  }

  private async saveNow(): Promise<void> {
    if (!this.activeDocument) return;
    if (this.revisionController) {
      await this.saveRevision(this.activeDocument);
      return;
    }
    if (!this.autosave) return;
    this.autosave.schedule(this.activeDocument);
    await this.autosave.flush();
  }

  private async retry(): Promise<void> {
    await this.saveNow();
  }

  private async synchronizeNow(): Promise<void> {
    await this.autosave?.flush();
    await this.resilientStorage?.synchronize();
  }

  private async resolveConflict(event: CustomEvent<FrakonDashboardConflictResolvedDetail>): Promise<void> {
    const envelope = await this.revisionController?.resolveConflict(event.detail.choice as DashboardConflictChoice);
    this.acceptResolvedEnvelope(envelope);
  }

  private async resolveDetailedConflict(event: CustomEvent<FrakonDetailedConflictResolvedDetail>): Promise<void> {
    const envelope = await this.revisionController?.resolveConflictSelections(event.detail.selections);
    this.acceptResolvedEnvelope(envelope);
  }

  private acceptResolvedEnvelope(envelope: Awaited<ReturnType<RevisionedDashboardSyncController['resolveConflict']>>): void {
    if (!envelope) return;
    this.activeDocument = structuredClone(envelope.document);
    this.document = structuredClone(envelope.document);
    this.emitChanged(true);
  }

  private emitChanged(saved: boolean): void {
    if (!this.activeDocument) return;
    this.dispatchEvent(new CustomEvent<FrakonStorageStudioChangedDetail>('frakon-storage-studio-changed', {
      detail: { document: structuredClone(this.activeDocument), saved },
      bubbles: true,
      composed: true,
    }));
  }

  private statusLabel(): string {
    if (this.loading || this.revisionState?.loading) return 'Loading dashboard…';
    if (this.revisionState?.conflict) return 'Dashboard changed on another device';
    if (this.revisionState?.saving) return 'Saving revision to Home Assistant…';
    if (this.resilientState?.syncing) return 'Synchronizing changes with Home Assistant…';
    if (this.autosaveState.saving) return 'Saving dashboard…';
    if (this.autosaveState.pending) return 'Changes waiting to be saved';
    if (this.resilientState?.mode === 'fallback') {
      const waiting = this.resilientState.pending;
      return waiting > 0
        ? `Saved locally · Home Assistant offline · ${waiting} change${waiting === 1 ? '' : 's'} waiting to sync`
        : 'Saved locally · Home Assistant offline';
    }
    const error = this.revisionState?.error ?? this.autosaveState.error ?? this.resilientState?.error;
    if (error) return error.message;
    if (this.revisionState?.envelope) {
      const time = new Date(this.revisionState.envelope.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `Revision synchronized · ${time}`;
    }
    if (this.autosaveState.lastSavedAt) {
      const time = new Date(this.autosaveState.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return this.resilientState ? `All changes synchronized · ${time}` : `Saved at ${time}`;
    }
    return this.controller ? `Storage ready · ${this.controller.adapterKind}` : 'Storage not configured';
  }

  private statusClass(): string {
    if (this.revisionState?.conflict) return 'conflict';
    if (this.revisionState?.saving || this.resilientState?.syncing) return 'syncing';
    if (this.resilientState?.mode === 'fallback') return 'fallback';
    if (this.revisionState?.error || this.autosaveState.error || this.resilientState?.error) return 'error';
    if (this.loading || this.revisionState?.loading || this.autosaveState.saving) return 'saving';
    if (this.autosaveState.pending) return 'pending';
    return this.revisionState?.envelope || this.autosaveState.lastSavedAt ? 'saved' : '';
  }

  render() {
    const document = this.activeDocument ?? this.document;
    const hasError = Boolean(this.revisionState?.error || this.autosaveState.error || this.resilientState?.error);
    const busy = Boolean(this.loading || this.revisionState?.loading || this.revisionState?.saving || this.autosaveState.saving);
    const canSynchronize = Boolean(
      this.resilientStorage
      && !this.resilientState?.syncing
      && (this.resilientState?.pending ?? 0) > 0,
    );
    const conflict = this.revisionState?.conflict;
    return html`
      <section class="shell">
        <div class="storage-bar" role="status" aria-live="polite">
          <div class=${`status ${hasError ? 'error' : ''}`}>
            <span class=${`dot ${this.statusClass()}`}></span>
            <span class="label">${this.statusLabel()}</span>
          </div>
          <div class="actions">
            ${hasError ? html`<button @click=${this.retry}>Retry save</button>` : nothing}
            ${this.resilientStorage ? html`
              <button ?disabled=${!canSynchronize} @click=${this.synchronizeNow}>Synchronize now</button>
            ` : nothing}
            <button ?disabled=${!document || busy || Boolean(conflict)} @click=${this.saveNow}>Save now</button>
          </div>
        </div>
        ${conflict ? html`
          <div class="conflict-stack">
            <frakon-dashboard-conflict-panel
              .local=${conflict.comparison.local}
              .remote=${conflict.comparison.remote}
              .merge=${conflict.merge}
              @frakon-dashboard-conflict-resolved=${this.resolveConflict}
            ></frakon-dashboard-conflict-panel>
            ${conflict.merge.conflicts.length > 0 ? html`
              <frakon-dashboard-detailed-conflict-panel
                .local=${conflict.comparison.local}
                .remote=${conflict.comparison.remote}
                .merge=${conflict.merge}
                @frakon-dashboard-detailed-conflict-resolved=${this.resolveDetailedConflict}
              ></frakon-dashboard-detailed-conflict-panel>
            ` : nothing}
          </div>
        ` : nothing}
        ${document ? html`
          <frakon-dashboard-studio-history
            .document=${document}
            @frakon-history-studio-changed=${this.onHistoryChanged}
          ></frakon-dashboard-studio-history>
        ` : html`<p>${busy ? 'Loading dashboard…' : 'No dashboard document loaded.'}</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio-storage': FrakonDashboardStudioStorage;
  }
}
