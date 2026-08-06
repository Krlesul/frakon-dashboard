import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DashboardAutosaveController,
  type DashboardAutosaveState,
} from '../../../src/dashboard/dashboard-autosave-controller';
import type { DashboardStorageController } from '../../../src/dashboard/dashboard-storage-controller';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type {
  ResilientDashboardStorageAdapter,
  ResilientDashboardStorageState,
} from '../../../src/dashboard/resilient-dashboard-storage';
import type { FrakonHistoryStudioChangedDetail } from './dashboard-studio-history';
import './dashboard-studio-history';

export interface FrakonStorageStudioChangedDetail {
  document: FrakonDashboardDocument;
  saved: boolean;
}

@customElement('frakon-dashboard-studio-storage')
export class FrakonDashboardStudioStorage extends LitElement {
  @property({ attribute: false }) controller?: DashboardStorageController;
  @property({ attribute: false }) resilientStorage?: ResilientDashboardStorageAdapter;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property() dashboardId = '';
  @property({ type: Number }) autosaveDelay = 650;

  @state() private activeDocument?: FrakonDashboardDocument;
  @state() private loading = false;
  @state() private autosaveState: DashboardAutosaveState = { pending: false, saving: false };
  @state() private resilientState?: ResilientDashboardStorageState;

  private autosave?: DashboardAutosaveController;
  private unsubscribeAutosave?: () => void;
  private unsubscribeResilient?: () => void;
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
    .dot.pending,.dot.fallback { background:#ffcf66; }
    .dot.saving,.dot.syncing { background:#69a7ff; box-shadow:0 0 0 4px rgb(105 167 255 / 12%); }
    .dot.saved { background:#5fd39a; }
    .dot.error { background:#ff5c72; }
    .label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
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
    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('controller') || changed.has('autosaveDelay')) this.configureAutosave();
    if (changed.has('resilientStorage')) this.configureResilientSubscription();
    if (changed.has('document') && this.document) this.activeDocument = structuredClone(this.document);
    if ((changed.has('controller') || changed.has('dashboardId')) && this.controller && this.dashboardId) {
      void this.loadDocument();
    }
  }

  private readonly pagehideListener = (): void => {
    void this.autosave?.flush();
  };

  private configureAutosave(): void {
    this.disposeAutosave();
    if (!this.controller) return;
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

  private async loadDocument(): Promise<void> {
    const controller = this.controller;
    if (!controller || !this.dashboardId) return;
    const generation = ++this.loadGeneration;
    this.loading = true;
    const loaded = await controller.load(this.dashboardId);
    if (generation !== this.loadGeneration) return;
    if (loaded) {
      this.activeDocument = loaded;
      this.document = structuredClone(loaded);
    }
    this.loading = false;
  }

  private onHistoryChanged(event: CustomEvent<FrakonHistoryStudioChangedDetail>): void {
    this.activeDocument = event.detail.document;
    this.document = structuredClone(event.detail.document);
    this.autosave?.schedule(event.detail.document);
    this.emitChanged(false);
  }

  private async saveNow(): Promise<void> {
    if (!this.activeDocument || !this.autosave) return;
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

  private emitChanged(saved: boolean): void {
    if (!this.activeDocument) return;
    this.dispatchEvent(new CustomEvent<FrakonStorageStudioChangedDetail>('frakon-storage-studio-changed', {
      detail: { document: structuredClone(this.activeDocument), saved },
      bubbles: true,
      composed: true,
    }));
  }

  private statusLabel(): string {
    if (this.loading) return 'Loading dashboard…';
    if (this.resilientState?.syncing) return 'Synchronizing changes with Home Assistant…';
    if (this.autosaveState.saving) return 'Saving dashboard…';
    if (this.autosaveState.pending) return 'Changes waiting to be saved';
    if (this.resilientState?.mode === 'fallback') {
      const waiting = this.resilientState.pending;
      return waiting > 0
        ? `Saved locally · Home Assistant offline · ${waiting} change${waiting === 1 ? '' : 's'} waiting to sync`
        : 'Saved locally · Home Assistant offline';
    }
    if (this.autosaveState.error) return this.autosaveState.error.message;
    if (this.resilientState?.error) return this.resilientState.error.message;
    if (this.autosaveState.lastSavedAt) {
      const time = new Date(this.autosaveState.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return this.resilientState ? `All changes synchronized · ${time}` : `Saved at ${time}`;
    }
    return this.controller ? `Storage ready · ${this.controller.adapterKind}` : 'Storage not configured';
  }

  private statusClass(): string {
    if (this.resilientState?.syncing) return 'syncing';
    if (this.resilientState?.mode === 'fallback') return 'fallback';
    if (this.autosaveState.error || this.resilientState?.error) return 'error';
    if (this.loading || this.autosaveState.saving) return 'saving';
    if (this.autosaveState.pending) return 'pending';
    return this.autosaveState.lastSavedAt ? 'saved' : '';
  }

  render() {
    const document = this.activeDocument ?? this.document;
    const hasError = Boolean(this.autosaveState.error || this.resilientState?.error);
    const canSynchronize = Boolean(
      this.resilientStorage
      && !this.resilientState?.syncing
      && (this.resilientState?.pending ?? 0) > 0,
    );
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
            <button
              ?disabled=${!document || this.loading || this.autosaveState.saving}
              @click=${this.saveNow}
            >Save now</button>
          </div>
        </div>
        ${document ? html`
          <frakon-dashboard-studio-history
            .document=${document}
            @frakon-history-studio-changed=${this.onHistoryChanged}
          ></frakon-dashboard-studio-history>
        ` : html`<p>${this.loading ? 'Loading dashboard…' : 'No dashboard document loaded.'}</p>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio-storage': FrakonDashboardStudioStorage;
  }
}
