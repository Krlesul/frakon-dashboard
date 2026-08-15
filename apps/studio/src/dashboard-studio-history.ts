import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import { setDashboardAutoLayoutOverrides } from '../../../src/dashboard/auto-layout-overrides';
import { scoreDashboardItemPriority } from '../../../src/dashboard/auto-layout-priority';
import { DashboardAutoLayoutSession, type DashboardAutoLayoutPreview } from '../../../src/dashboard/auto-layout-session';
import { StudioHistoryController, type StudioHistoryChangeSource } from '../../../src/dashboard/studio-history-controller';
import { resolveStudioHistoryShortcut } from '../../../src/dashboard/studio-history-shortcuts';
import type { FrakonBreakpoint, FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type {
  FrakonAutoLayoutActionDetail,
  FrakonAutoLayoutBreakpointChangedDetail,
  FrakonAutoLayoutOverrideChangedDetail,
} from './auto-layout-panel';
import type {
  FrakonDashboardStudioChangedDetail,
  FrakonDashboardStudioInteractionDetail,
  FrakonDashboardStudioInteractionKind,
} from './dashboard-studio';
import type { FrakonHistoryActionDetail } from './history-toolbar';
import './auto-layout-panel';
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
  @state() private studioSelection: SelectionState = { ids: [] };
  @state() private autoLayoutPreview?: DashboardAutoLayoutPreview;
  @state() private autoLayoutBreakpoint?: FrakonBreakpoint;

  private controller?: StudioHistoryController;
  private autoLayoutSession?: DashboardAutoLayoutSession;
  private commitTimer?: ReturnType<typeof setTimeout>;
  private syncingExternal = false;
  private interactionActive = false;
  private interactionKind?: FrakonDashboardStudioInteractionKind;
  private readonly keydownListener = (event: KeyboardEvent) => this.onKeydown(event);

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:10px; }
    .toolbar { position:sticky; top:8px; z-index:50; }
    .designer { position:sticky; top:62px; z-index:45; }
    .preview-shell { position:relative; }
    .preview-shell.locked { pointer-events:none; }
    .preview-lock {
      position:absolute;
      z-index:80;
      top:14px;
      right:14px;
      padding:7px 10px;
      border:1px solid rgb(105 167 255 / 30%);
      border-radius:999px;
      color:#dcecff;
      background:rgb(15 34 61 / 88%);
      font:650 11px/1.2 Inter,system-ui,sans-serif;
      pointer-events:none;
    }
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
      this.autoLayoutBreakpoint = this.document.breakpoint;
      this.refreshState();
      return;
    }
    if (this.syncingExternal) {
      this.syncingExternal = false;
      return;
    }
    this.clearAutoLayoutState();
    this.controller.replace(this.document);
    this.visibleDocument = this.controller.visible;
    this.autoLayoutBreakpoint = this.document.breakpoint;
    this.refreshState();
  }

  private onStudioChanged(event: CustomEvent<FrakonDashboardStudioChangedDetail>): void {
    this.studioSelection = event.detail.selection;
    if (!this.controller || this.autoLayoutPreview) return;
    const next = event.detail.document;
    if (this.controller.previewActive) this.controller.updatePreview(next);
    else this.controller.beginPreview(next, this.previewSource());
    this.visibleDocument = this.controller.visible;
    if (!this.interactionActive) this.scheduleCommit();
  }

  private onStudioInteraction(event: CustomEvent<FrakonDashboardStudioInteractionDetail>): void {
    if (!this.controller || this.autoLayoutPreview) return;
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
    if (this.interactionActive || this.autoLayoutPreview) return;
    if (this.commitTimer) clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => {
      this.commitTimer = undefined;
      this.commitPendingPreview();
    }, 220);
  }

  private commitPendingPreview(sourceOverride?: StudioHistoryChangeSource): void {
    if (!this.controller?.previewActive || this.autoLayoutPreview) return;
    const committed = this.controller.commitPreview();
    this.visibleDocument = committed;
    this.syncDocumentProperty(committed);
    this.lastSource = sourceOverride ?? this.controller.snapshot().lastSource ?? 'studio edit';
    this.refreshState();
    this.emitChanged();
  }

  private runHistoryAction(action: 'undo' | 'redo'): void {
    if (!this.controller || this.interactionActive || this.autoLayoutPreview) return;
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
    if (this.interactionActive || this.autoLayoutPreview) return;
    const action = resolveStudioHistoryShortcut(event);
    if (!action) return;
    if (action === 'undo' && !this.canUndo) return;
    if (action === 'redo' && !this.canRedo) return;
    event.preventDefault();
    this.runHistoryAction(action);
  }

  private prepareAutoLayoutSession(): DashboardAutoLayoutSession | undefined {
    const controller = this.controller;
    if (!controller) return undefined;
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = undefined;
    }
    if (controller.previewActive && !this.autoLayoutPreview) this.commitPendingPreview();
    this.autoLayoutSession = new DashboardAutoLayoutSession(controller.committed, scoreDashboardItemPriority);
    this.autoLayoutBreakpoint ??= controller.committed.breakpoint;
    return this.autoLayoutSession;
  }

  private setAutoLayoutPreview(variant: number): void {
    const controller = this.controller;
    const session = this.autoLayoutSession ?? this.prepareAutoLayoutSession();
    if (!controller || !session) return;
    const breakpoint = this.autoLayoutBreakpoint ?? controller.committed.breakpoint;
    const preview = breakpoint === controller.committed.breakpoint
      ? session.preview(variant)
      : session.previewBreakpoint(breakpoint, variant);
    if (controller.previewActive) controller.updatePreview(preview.proposal);
    else controller.beginPreview(preview.proposal, 'auto-layout');
    this.autoLayoutPreview = preview;
    this.visibleDocument = controller.visible;
  }

  private onAutoLayoutAction(event: CustomEvent<FrakonAutoLayoutActionDetail>): void {
    const controller = this.controller;
    if (!controller) return;
    if (event.detail.action === 'start') {
      this.prepareAutoLayoutSession();
      this.setAutoLayoutPreview(0);
      return;
    }
    if (!this.autoLayoutPreview || !this.autoLayoutSession) return;
    if (event.detail.action === 'next') {
      this.setAutoLayoutPreview(this.autoLayoutPreview.variant + 1);
      return;
    }
    if (event.detail.action === 'revert') {
      this.visibleDocument = controller.cancelPreview();
      this.clearAutoLayoutState(false);
      return;
    }
    if (event.detail.action === 'apply') {
      if (this.autoLayoutPreview.breakpoint !== controller.committed.breakpoint) return;
      const committed = controller.commitPreview();
      this.visibleDocument = committed;
      this.syncDocumentProperty(committed);
      this.lastSource = 'auto-layout';
      this.clearAutoLayoutState(false);
      this.refreshState();
      this.emitChanged();
    }
  }

  private onAutoLayoutBreakpointChanged(event: CustomEvent<FrakonAutoLayoutBreakpointChangedDetail>): void {
    this.autoLayoutBreakpoint = event.detail.breakpoint;
    if (this.autoLayoutPreview) this.setAutoLayoutPreview(this.autoLayoutPreview.variant);
  }

  private onAutoLayoutOverrideChanged(event: CustomEvent<FrakonAutoLayoutOverrideChangedDetail>): void {
    const controller = this.controller;
    if (!controller || this.autoLayoutPreview) return;
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
      this.commitTimer = undefined;
    }
    if (controller.previewActive) this.commitPendingPreview();
    const result = setDashboardAutoLayoutOverrides(controller.committed, event.detail.itemId, {
      ...('priority' in event.detail ? { priority: event.detail.priority } : {}),
      ...('semanticGroup' in event.detail ? { semanticGroup: event.detail.semanticGroup } : {}),
    });
    if (result.status !== 'committed') return;
    const committed = controller.push(result.document, 'auto-layout');
    this.visibleDocument = committed;
    this.syncDocumentProperty(committed);
    this.lastSource = 'auto-layout';
    this.refreshState();
    this.emitChanged();
  }

  private clearAutoLayoutState(resetBreakpoint = true): void {
    this.autoLayoutSession = undefined;
    this.autoLayoutPreview = undefined;
    if (resetBreakpoint) this.autoLayoutBreakpoint = this.controller?.committed.breakpoint ?? this.document?.breakpoint;
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
    const canonical = this.controller?.committed ?? this.document;
    if (!document || !canonical) return html`<p>No dashboard document loaded.</p>`;
    const previewActive = Boolean(this.autoLayoutPreview);
    return html`
      <section class="shell">
        <div class="toolbar">
          <frakon-history-toolbar
            .canUndo=${this.canUndo && !previewActive}
            .canRedo=${this.canRedo && !previewActive}
            .lastSource=${this.lastSource}
            @frakon-history-action=${this.onToolbarAction}
          ></frakon-history-toolbar>
        </div>
        <div class="designer">
          <frakon-auto-layout-panel
            .document=${canonical}
            .selection=${this.studioSelection}
            .preview=${this.autoLayoutPreview}
            .previewBreakpoint=${this.autoLayoutBreakpoint}
            @frakon-auto-layout-action=${this.onAutoLayoutAction}
            @frakon-auto-layout-breakpoint-changed=${this.onAutoLayoutBreakpointChanged}
            @frakon-auto-layout-override-changed=${this.onAutoLayoutOverrideChanged}
          ></frakon-auto-layout-panel>
        </div>
        <div class="preview-shell ${previewActive ? 'locked' : ''}">
          ${previewActive ? html`<div class="preview-lock">Preview · use Automatic Designer controls to apply or revert</div>` : nothing}
          <frakon-dashboard-studio
            .document=${document}
            @frakon-dashboard-studio-changed=${this.onStudioChanged}
            @frakon-dashboard-studio-interaction=${this.onStudioInteraction}
          ></frakon-dashboard-studio>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio-history': FrakonDashboardStudioHistory;
  }
}
