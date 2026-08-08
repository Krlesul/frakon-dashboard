import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardConfig } from '../home-assistant/types';
import { createHomeAssistantDashboardStorage, type DashboardStorageMode } from '../home-assistant/dashboard-storage-factory';
import './card-host';
import './canvas-v2-breakpoint-toolbar';
import type { FrakonCanvasV2BreakpointSelectDetail } from './canvas-v2-breakpoint-toolbar';
import './canvas-v2-view';
import type { FrakonCanvasV2DraftDetail } from './canvas-v2-view';
import { canvasDashboardTranslate, resolveCanvasDashboardLanguage } from './canvas-dashboard-i18n';
import { DashboardCanvasSession, type DashboardCanvasPoint, type DashboardCanvasPreview } from './dashboard-canvas-session';
import { projectDashboardGridToCanvas } from './dashboard-canvas-placement';
import {
  dashboardLayoutCapabilitiesFromServer,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import { DashboardStorageController } from './dashboard-storage-controller';
import { createDashboardV2MigrationPreview } from './dashboard-v2-migration-preview';
import { loadDashboardV2ReadOnly } from './dashboard-v2-read-loader';
import { normalizeDashboard, type FrakonBreakpoint, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController, type ResponsiveV2DraftSnapshot } from './responsive-v2-draft-controller';
import './responsive-v2-health-panel';
import { responsiveCanvasV2HealthReportFromEditorState } from './responsive-v2-health-report';

export interface FrakonCanvasDashboardCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-canvas-dashboard-card';
  entity: string;
  dashboard_id?: string;
  title?: string;
  columns?: number;
  row_height?: number;
  gap?: number;
  edit_mode?: boolean;
  storage?: DashboardStorageMode;
  items?: FrakonGridItem[];
  language?: string;
}

@customElement('frakon-canvas-dashboard-card')
export class FrakonCanvasDashboardCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonCanvasDashboardCardConfig;
  @state() private document?: FrakonDashboardDocument;
  @state() private nativeV2Document?: FrakonDashboardDocumentV2;
  @state() private nativeV2Revision?: string;
  @state() private nativeV2DraftDirty = false;
  @state() private nativeV2CanUndo = false;
  @state() private nativeV2CanRedo = false;
  @state() private nativeV2ActiveBreakpoint: FrakonBreakpoint = 'desktop';
  @state() private nativeV2AvailableBreakpoints: FrakonBreakpoint[] = [];
  @state() private nativeV2DirtyBreakpoints: FrakonBreakpoint[] = [];
  @state() private selectedId?: string;
  @state() private preview?: DashboardCanvasPreview;
  @state() private message?: string;
  @state() private width = 1000;
  @state() private serverCapabilities?: DashboardServerCapabilities;
  @state() private capabilitiesError?: string;

  private storageController = new DashboardStorageController(createHomeAssistantDashboardStorage('local'));
  private storageKind = this.storageController.adapterKind;
  private resizeObserver?: ResizeObserver;
  private session?: DashboardCanvasSession;
  private pointerId?: number;
  private nativeV2DraftController?: ResponsiveV2DraftController;

  static styles = css`
    :host { display: block; }
    .shell { padding: 16px; border-radius: 24px; background: var(--card-background-color); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    h2 { margin: 0; font-size: 21px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .responsive-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .health { margin-bottom: 10px; }
    .dirty-list { font-size: 11px; opacity: .72; }
    .badge { padding: 6px 10px; border-radius: 999px; font-size: 12px; background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
    .experimental { background: color-mix(in srgb, #f0a85a 22%, transparent); }
    .blocked { background: color-mix(in srgb, #ff4d67 18%, transparent); }
    .ready { background: color-mix(in srgb, #4bbf73 18%, transparent); }
    .migration { opacity: .86; }
    .draft-action { border: 0; border-radius: 9px; padding: 6px 9px; color: inherit; background: color-mix(in srgb, var(--primary-color) 13%, transparent); cursor: pointer; font: inherit; }
    .draft-action.danger { background: color-mix(in srgb, #ff4d67 14%, transparent); }
    .draft-action:disabled { opacity: .4; cursor: default; }
    .message { margin-bottom: 10px; padding: 8px 10px; border-radius: 10px; font-size: 12px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .message.error { background: color-mix(in srgb, #ff4d67 16%, transparent); }
    .canvas { position: relative; min-height: 120px; overflow: hidden; border-radius: 18px; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%); }
    .item { position: absolute; min-width: 0; min-height: 0; overflow: hidden; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background: var(--card-background-color); box-sizing: border-box; }
    .item.selected { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .item.collision { outline: 2px solid #ff4d67; outline-offset: 2px; }
    .head { position: absolute; z-index: 5; top: 5px; left: 5px; right: 5px; display: flex; justify-content: space-between; gap: 6px; pointer-events: none; }
    .move, .resize { pointer-events: auto; border: 0; border-radius: 8px; padding: 5px 7px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 82%, var(--primary-color) 18%); cursor: grab; touch-action: none; }
    .resize { position: absolute; z-index: 6; right: 4px; bottom: 4px; width: 18px; height: 18px; padding: 0; cursor: nwse-resize; background: color-mix(in srgb, var(--primary-color) 72%, transparent); }
    .content { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  `;

  setConfig(config: FrakonCanvasDashboardCardConfig): void {
    this.config = config;
    const id = config.dashboard_id ?? 'canvas-experimental';
    this.document = normalizeDashboard({
      version: 1,
      id,
      title: config.title ?? 'FRAKON Canvas',
      breakpoint: 'desktop',
      columns: config.columns ?? 12,
      rowHeight: config.row_height ?? 48,
      gap: config.gap ?? 12,
      items: config.items ?? [],
    });
    this.clearNativeV2State();
    this.configureStorage();
    this.cancelInteraction();
    void this.loadDashboard(id);
  }

  static getStubConfig(): FrakonCanvasDashboardCardConfig {
    return {
      type: 'custom:frakon-canvas-dashboard-card',
      entity: 'sensor.placeholder',
      dashboard_id: 'canvas-experimental',
      title: 'FRAKON Canvas Experimental',
      columns: 12,
      row_height: 48,
      gap: 12,
      edit_mode: true,
      storage: 'local',
      items: [],
    };
  }

  firstUpdated(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && Math.abs(next - this.width) > 1) this.width = next;
    });
    this.resizeObserver.observe(this);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('hass')) return;
    const changedStorage = this.configureStorage();
    if ((changedStorage || this.config?.storage === 'home-assistant') && this.document) {
      void this.loadDashboard(this.document.id);
    }
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.cancelInteraction();
    super.disconnectedCallback();
  }

  getCardSize(): number { return 8; }

  private language() {
    return resolveCanvasDashboardLanguage(
      this.config?.language,
      this.hass?.locale?.language,
      this.hass?.language,
    );
  }

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string {
    return canvasDashboardTranslate(this.language(), key);
  }

  private configureStorage(): boolean {
    const next = createHomeAssistantDashboardStorage(this.config?.storage ?? 'local', this.hass);
    if (next.kind === this.storageKind) return false;
    this.storageController = new DashboardStorageController(next);
    this.storageKind = next.kind;
    return true;
  }

  private clearNativeV2State(): void {
    this.nativeV2Document = undefined;
    this.nativeV2Revision = undefined;
    this.nativeV2DraftDirty = false;
    this.nativeV2CanUndo = false;
    this.nativeV2CanRedo = false;
    this.nativeV2ActiveBreakpoint = 'desktop';
    this.nativeV2AvailableBreakpoints = [];
    this.nativeV2DirtyBreakpoints = [];
    this.nativeV2DraftController = undefined;
  }

  private applyNativeV2Snapshot(snapshot: ResponsiveV2DraftSnapshot): void {
    this.nativeV2Document = snapshot.active.document;
    this.nativeV2ActiveBreakpoint = snapshot.activeBreakpoint;
    this.nativeV2AvailableBreakpoints = Object.keys(snapshot.documents) as FrakonBreakpoint[];
    this.nativeV2DirtyBreakpoints = snapshot.dirtyBreakpoints;
    this.nativeV2DraftDirty = snapshot.dirtyBreakpoints.length > 0;
    this.nativeV2CanUndo = snapshot.active.canUndo;
    this.nativeV2CanRedo = snapshot.active.canRedo;
  }

  private async loadDashboard(id: string): Promise<void> {
    this.clearNativeV2State();

    if (this.config?.storage === 'home-assistant' && this.hass?.callWS) {
      const hass = this.hass;
      try {
        const result = await loadDashboardV2ReadOnly({
          request: <T>(command: string, payload: Record<string, unknown>) => hass.callWS!<T>({ type: command, ...payload }),
        }, id);
        this.serverCapabilities = result.capabilities;
        this.capabilitiesError = undefined;

        if (result.status === 'loaded') {
          if (this.document?.id !== id) return;
          this.nativeV2Revision = result.envelope.revision;
          this.nativeV2DraftController = new ResponsiveV2DraftController(result.envelope.document, result.envelope.document.breakpoint);
          this.applyNativeV2Snapshot(this.nativeV2DraftController.snapshot);
          this.cancelInteraction();
          return;
        }
        if (result.status === 'invalid' && result.reason === 'invalid-envelope') {
          this.capabilitiesError = 'Invalid dashboard revision envelope returned by Home Assistant.';
          return;
        }
      } catch (error) {
        this.serverCapabilities = undefined;
        this.capabilitiesError = error instanceof Error ? error.message : String(error);
      }
    } else {
      this.serverCapabilities = undefined;
      this.capabilitiesError = undefined;
    }

    await this.loadStoredV1(id);
  }

  private async loadStoredV1(id: string): Promise<void> {
    const stored = await this.storageController.load(id);
    if (!stored || this.document?.id !== id) return;
    this.document = normalizeDashboard(stored);
  }

  private persist(document: FrakonDashboardDocument): void {
    if (this.nativeV2Document) return;
    this.document = normalizeDashboard(document);
    void this.storageController.save(this.document);
    this.dispatchEvent(new CustomEvent('frakon-layout-changed', {
      detail: { document: this.document, source: 'canvas-experimental' },
      bubbles: true,
      composed: true,
    }));
  }

  private onNativeV2Draft(event: CustomEvent<FrakonCanvasV2DraftDetail>): void {
    const controller = this.nativeV2DraftController;
    if (!controller) return;
    const result = event.detail;
    if (result.status === 'committed') {
      this.applyNativeV2Snapshot(controller.applyActive(result, true));
      this.message = this.nativeV2DraftDirty ? this.t('v2DraftUnsaved') : undefined;
    } else if (result.status === 'collision') {
      this.message = `${this.t('collisionBlocked')}: ${result.collisionIds.join(', ')}`;
    }
  }

  private undoNativeV2Draft(): void {
    const controller = this.nativeV2DraftController;
    if (!controller || !controller.snapshot.active.canUndo) return;
    this.applyNativeV2Snapshot(controller.undo());
    this.message = this.nativeV2DraftDirty ? this.t('v2DraftUnsaved') : undefined;
  }

  private redoNativeV2Draft(): void {
    const controller = this.nativeV2DraftController;
    if (!controller || !controller.snapshot.active.canRedo) return;
    this.applyNativeV2Snapshot(controller.redo());
    this.message = this.nativeV2DraftDirty ? this.t('v2DraftUnsaved') : undefined;
  }

  private onNativeV2HistoryKeyDown(event: KeyboardEvent): void {
    if (!this.nativeV2DraftController || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey) this.redoNativeV2Draft();
    else this.undoNativeV2Draft();
  }

  private onNativeV2BreakpointSelect(event: CustomEvent<FrakonCanvasV2BreakpointSelectDetail>): void {
    const controller = this.nativeV2DraftController;
    if (!controller) return;
    event.stopPropagation();
    this.applyNativeV2Snapshot(controller.switchTo(event.detail.breakpoint));
    this.message = this.nativeV2DraftDirty ? this.t('v2DraftUnsaved') : undefined;
  }

  private async discardNativeV2Draft(): Promise<void> {
    const id = this.nativeV2Document?.id ?? this.document?.id;
    if (!id) return;
    await this.loadDashboard(id);
    this.message = this.t('draftDiscarded');
  }

  private point(event: PointerEvent): DashboardCanvasPoint {
    return { x: event.clientX, y: event.clientY };
  }

  private beginMove(event: PointerEvent, item: FrakonGridItem): void {
    if (this.nativeV2Document || !this.document || item.locked || this.config?.edit_mode !== true || this.session || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedId = item.id;
    this.session = new DashboardCanvasSession(
      this.document,
      { kind: 'move', selectedIds: [item.id] },
      this.point(event),
      this.canvasWidth(),
    );
    this.pointerId = event.pointerId;
    this.preview = this.session.preview(this.point(event));
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginResize(event: PointerEvent, item: FrakonGridItem): void {
    if (this.nativeV2Document || !this.document || item.locked || this.config?.edit_mode !== true || this.session || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedId = item.id;
    this.session = new DashboardCanvasSession(
      this.document,
      { kind: 'resize', itemId: item.id, handle: 'se' },
      this.point(event),
      this.canvasWidth(),
    );
    this.pointerId = event.pointerId;
    this.preview = this.session.preview(this.point(event));
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.preview = this.session.preview(this.point(event));
  }

  private endInteraction(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    const result = this.session.commit(this.point(event));
    this.cancelInteraction();
    if (result.status === 'committed') {
      this.persist(result.document);
      this.message = this.t('changeCommitted');
    } else if (result.status === 'collision') {
      this.message = `${this.t('collisionBlocked')}: ${result.collisionIds.join(', ')}`;
    }
  }

  private cancelInteraction(): void {
    this.session = undefined;
    this.pointerId = undefined;
    this.preview = undefined;
  }

  private canvasWidth(): number {
    return Math.max(1, this.renderRoot.querySelector<HTMLElement>('.canvas')?.getBoundingClientRect().width ?? this.width);
  }

  private renderServerCapabilityBadges() {
    const capabilities = this.serverCapabilities
      ? dashboardLayoutCapabilitiesFromServer(this.serverCapabilities)
      : undefined;
    if (this.config?.storage !== 'home-assistant' || !capabilities) return nothing;
    return html`
      <span class="badge ${capabilities.readV2 ? 'ready' : 'blocked'}">${this.t(capabilities.readV2 ? 'v2ReadReady' : 'v2ReadBlocked')}</span>
      <span class="badge ${capabilities.writeV2 ? 'ready' : 'blocked'}">${this.t(capabilities.writeV2 ? 'v2WriteReady' : 'v2WriteBlocked')}</span>
    `;
  }

  private renderNativeV2() {
    if (!this.nativeV2Document) return nothing;
    const showHealth = this.config?.edit_mode === true && this.config?.storage === 'home-assistant';
    const healthReport = showHealth
      ? responsiveCanvasV2HealthReportFromEditorState({
          capabilities: this.serverCapabilities,
          revision: this.nativeV2Revision,
          controller: this.nativeV2DraftController,
          error: this.capabilitiesError,
        })
      : undefined;
    return html`
      <section class="shell" tabindex="0" @keydown=${this.onNativeV2HistoryKeyDown}>
        <header>
          <h2>${this.nativeV2Document.title}</h2>
          <div class="badges">
            <span class="badge experimental">${this.t('experimentalCanvas')}</span>
            <span class="badge ready">${this.t('v2NativeReadOnly')}</span>
            ${this.nativeV2DraftDirty ? html`<span class="badge blocked">${this.t('v2DraftUnsaved')}</span>` : nothing}
            ${this.renderServerCapabilityBadges()}
            ${this.nativeV2Revision ? html`<span class="badge">${this.nativeV2Revision}</span>` : nothing}
            ${this.config?.edit_mode === true ? html`
              <button class="draft-action" ?disabled=${!this.nativeV2CanUndo} @click=${this.undoNativeV2Draft}>${this.t('undo')}</button>
              <button class="draft-action" ?disabled=${!this.nativeV2CanRedo} @click=${this.redoNativeV2Draft}>${this.t('redo')}</button>
            ` : nothing}
            ${this.nativeV2DraftDirty
              ? html`<button class="draft-action danger" @click=${this.discardNativeV2Draft}>${this.t('discardDraft')}</button>`
              : nothing}
          </div>
        </header>
        ${this.config?.edit_mode === true ? html`
          <div class="responsive-row">
            <frakon-canvas-v2-breakpoint-toolbar
              .active=${this.nativeV2ActiveBreakpoint}
              .available=${this.nativeV2AvailableBreakpoints}
              @frakon-canvas-v2-breakpoint-select=${this.onNativeV2BreakpointSelect}
            ></frakon-canvas-v2-breakpoint-toolbar>
            ${this.nativeV2DirtyBreakpoints.length
              ? html`<span class="dirty-list">unsaved: ${this.nativeV2DirtyBreakpoints.join(' · ')}</span>`
              : nothing}
          </div>
        ` : nothing}
        ${healthReport ? html`
          <div class="health">
            <frakon-responsive-v2-health-panel
              .report=${healthReport}
              .language=${this.language()}
            ></frakon-responsive-v2-health-panel>
          </div>
        ` : nothing}
        ${this.capabilitiesError ? html`<div class="message error">${this.t('capabilityFailed')}: ${this.capabilitiesError}</div>` : nothing}
        ${this.message ? html`<div class="message">${this.message}</div>` : nothing}
        <frakon-canvas-v2-view
          .hass=${this.hass}
          .document=${this.nativeV2Document}
          .language=${this.language()}
          .width=${Math.max(1, this.width)}
          .editMode=${this.config?.edit_mode === true}
          @frakon-canvas-v2-draft=${this.onNativeV2Draft}
        ></frakon-canvas-v2-view>
      </section>
    `;
  }

  render() {
    if (this.nativeV2Document) return this.renderNativeV2();
    if (!this.document) return nothing;
    const width = this.canvasWidth();
    const projected = projectDashboardGridToCanvas(this.document, width);
    const placements = this.preview?.items ?? projected.items;
    const byId = new Map(placements.map((item) => [item.id, item]));
    const collisions = new Set(this.preview?.collisionIds ?? []);
    const minHeight = Math.max(
      this.document.rowHeight * 2,
      ...placements.map((item) => item.y + item.height + 12),
    );
    const editMode = this.config?.edit_mode === true;
    const migration = createDashboardV2MigrationPreview(this.document, width);

    return html`
      <section
        class="shell"
        @pointermove=${this.onPointerMove}
        @pointerup=${this.endInteraction}
        @pointercancel=${this.cancelInteraction}
      >
        <header>
          <h2>${this.document.title}</h2>
          <div class="badges">
            <span class="badge experimental">${this.t('experimentalCanvas')}</span>
            <span class="badge">${this.t('compatibleCommit')}</span>
            <span class="badge migration">
              ${this.t('migrationPreview')} · ${migration.itemCount} ${this.t('cards')} ·
              ${migration.lockedItemCount} ${this.t('lockedCards')} · ${migration.constraintCount} ${this.t('constraints')} ·
              ${Math.round(migration.canvasWidth)}×${Math.round(migration.estimatedCanvasHeight)} · ${this.t('writeLocked')}
            </span>
            ${this.renderServerCapabilityBadges()}
          </div>
        </header>
        ${this.capabilitiesError ? html`<div class="message error">${this.t('capabilityFailed')}: ${this.capabilitiesError}</div>` : nothing}
        ${this.message ? html`<div class="message">${this.message}</div>` : nothing}
        <div class="canvas" style=${`height:${minHeight}px`}>
          ${this.document.items.map((item) => {
            const placement = byId.get(item.id);
            if (!placement) return nothing;
            return html`
              <article
                class="item ${this.selectedId === item.id ? 'selected' : ''} ${collisions.has(item.id) ? 'collision' : ''}"
                style=${`left:${placement.x}px;top:${placement.y}px;width:${placement.width}px;height:${placement.height}px`}
                @click=${() => { this.selectedId = item.id; }}
              >
                ${editMode ? html`
                  <div class="head">
                    <button class="move" ?disabled=${item.locked} @pointerdown=${(event: PointerEvent) => this.beginMove(event, item)}>↕ ${item.id}</button>
                  </div>
                  ${!item.locked ? html`<button class="resize" title="Resize" @pointerdown=${(event: PointerEvent) => this.beginResize(event, item)}></button>` : nothing}
                ` : nothing}
                <div class="content"><frakon-card-host .hass=${this.hass} .config=${item.card}></frakon-card-host></div>
              </article>
            `;
          })}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-dashboard-card': FrakonCanvasDashboardCard;
  }
}
