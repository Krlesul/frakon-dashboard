import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StudioHistoryController, type StudioHistoryChangeSource } from '../../../src/dashboard/studio-history-controller';
import { resolveStudioHistoryShortcut } from '../../../src/dashboard/studio-history-shortcuts';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type {
  FrakonDashboardStudioChangedDetail,
  FrakonDashboardStudioInteractionDetail,
  FrakonDashboardStudioInteractionKind,
} from './dashboard-studio';
import type { FrakonHistoryActionDetail } from './history-toolbar';
import './dashboard-studio';
import './history-toolbar';

export interface FrakonHistoryStudioChangedDetail {
  document: FrakonDashboardDocument;
  canUndo: boolean;
  canRedo: boolean;
}

@customElement('frakon-dashboard-studio-history')
export class FrakonDashboardStudioHistory extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @state() private visibleDocument?: FrakonDashboardDocument;
  @state() private canUndo = false;
  @state() private canRedo = false;
  @state() private lastSource = '';

  private controller?: StudioHistoryController;
  private commitTimer?: ReturnType<typeof setTimeout>;
  private syncingExternal = false;
  private interactionActive = false;
  private interactionKind?: FrakonDashboardStudioInteractionKind;
  private readonly keydownListener = (event: KeyboardEvent) => this.onKeydown(event);

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:10px; }
    .toolbar { position:sticky; top:8px; z-index:50; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.keydownListener);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.keydownListener);
    if (this.commitTimer) clearTimeout(this.commitTimer);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (!changed.has('document') || !this.document) return;
    if (!this.controller) {
      this.controller = new StudioHistoryController(this.document);
      this.visibleDocument = this.controller.visible;
      this.refreshState();
      return;
    }
    if (this.syncingExternal) {
      this.syncingExternal = false;
      return;
    }
    this.controller.replace(this.document);
    this.visibleDocument = this.controller.visible;
    this.refreshState();
  }

  private onStudioChanged(event: CustomEvent<FrakonDashboardStudioChangedDetail>): void {
    if (!this.controller) return;
    const next = event.detail.document;
    if (this.controller.previewActive) this.controller.updatePreview(next);
    else this.controller.beginPreview(next, this.previewSource());
    this.visibleDocument = this.controller.visible;
    if (!this.interactionActive) this.scheduleCommit();
  }

  private onStudioInteraction(event: CustomEvent<FrakonDashboardStudioInteractionDetail>): void {
    if (!this.controller) return;
    if (event.detail.phase === 'start') {
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
        this.commitTimer = undefined;
      }
      if (this.controller.previewActive) this.commitPendingPreview();
      this.interactionActive = true;
      this.interactionKind = event.detail.kind;
      return;
    }

    this.interactionActive = false;
    const kind = this.interactionKind ?? event.detail.kind;
    this.interactionKind = undefined;
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = undefined;
    }
    if (this.controller.previewActive) {
      this.commitPendingPreview(kind);
    }
  }

  private previewSource(): StudioHistoryChangeSource {
    return this.interactionKind ?? 'external';
  }

  private scheduleCommit(): void {
    if (this.interactionActive) return;
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      this.commitTimer = undefined;
      this.commitPendingPreview();
    }, 220);
  }

  private commitPendingPreview(sourceOverride?: StudioHistoryChangeSource): void {
    if (!this.controller?.previewActive) return;
    const committed = this.controller.commitPreview();
    this.visibleDocument = committed;
    this.syncDocumentProperty(committed);
    this.lastSource = sourceOverride ?? this.controller.snapshot().lastSource ?? 'studio edit';
    this.refreshState();
    this.emitChanged();
  }

  private runHistoryAction(action: 'undo' | 'redo'): void {
    if (!this.controller || this.interactionActive) return;
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = undefined;
    }
    const document = action === 'undo' ? this.controller.undo() : this.controller.redo();
    this.visibleDocument = document;
    this.syncDocumentProperty(document);
    this.lastSource = action;
    this.refreshState();
    this.emitChanged();
  }

  private onToolbarAction(event: CustomEvent<FrakonHistoryActionDetail>): void {
    this.runHistoryAction(event.detail.action);
  }

  private onKeydown(event: KeyboardEvent): void {
    if (this.interactionActive) return;
    const action = resolveStudioHistoryShortcut(event);
    if (!action) return;
    if (action === 'undo' && !this.canUndo) return;
    if (action === 'redo' && !this.canRedo) return;
    event.preventDefault();
    this.runHistoryAction(action);
  }

  private syncDocumentProperty(document: FrakonDashboardDocument): void {
    this.syncingExternal = true;
    this.document = structuredClone(document);
  }

  private refreshState(): void {
    this.canUndo = this.controller?.canUndo ?? false;
    this.canRedo = this.controller?.canRedo ?? false;
  }

  private emitChanged(): void {
    if (!this.visibleDocument) return;
    this.dispatchEvent(new CustomEvent<FrakonHistoryStudioChangedDetail>('frakon-history-studio-changed', {
      detail: {
        document: structuredClone(this.visibleDocument),
        canUndo: this.canUndo,
        canRedo: this.canRedo,
      },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const document = this.visibleDocument ?? this.document;
    if (!document) return html`<p>No dashboard document loaded.</p>`;
    return html`
      <section class="shell">
        <div class="toolbar">
          <frakon-history-toolbar
            .canUndo=${this.canUndo}
            .canRedo=${this.canRedo}
            .lastSource=${this.lastSource}
            @frakon-history-action=${this.onToolbarAction}
          ></frakon-history-toolbar>
        </div>
        <frakon-dashboard-studio
          .document=${document}
          @frakon-dashboard-studio-changed=${this.onStudioChanged}
          @frakon-dashboard-studio-interaction=${this.onStudioInteraction}
        ></frakon-dashboard-studio>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio-history': FrakonDashboardStudioHistory;
  }
}
