import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardConfig } from '../home-assistant/types';
import { createHomeAssistantDashboardStorage, type DashboardStorageMode } from '../home-assistant/dashboard-storage-factory';
import './card-host';
import { DashboardCanvasSession, type DashboardCanvasPoint, type DashboardCanvasPreview } from './dashboard-canvas-session';
import { projectDashboardGridToCanvas } from './dashboard-canvas-placement';
import { DashboardStorageController } from './dashboard-storage-controller';
import { normalizeDashboard, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';

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
}

@customElement('frakon-canvas-dashboard-card')
export class FrakonCanvasDashboardCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonCanvasDashboardCardConfig;
  @state() private document?: FrakonDashboardDocument;
  @state() private selectedId?: string;
  @state() private preview?: DashboardCanvasPreview;
  @state() private message?: string;
  @state() private width = 1000;

  private storageController = new DashboardStorageController(createHomeAssistantDashboardStorage('local'));
  private storageKind = this.storageController.adapterKind;
  private resizeObserver?: ResizeObserver;
  private session?: DashboardCanvasSession;
  private pointerId?: number;

  static styles = css`
    :host { display: block; }
    .shell { padding: 16px; border-radius: 24px; background: var(--card-background-color); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    h2 { margin: 0; font-size: 21px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge { padding: 6px 10px; border-radius: 999px; font-size: 12px; background: color-mix(in srgb, var(--primary-color) 15%, transparent); }
    .experimental { background: color-mix(in srgb, #f0a85a 22%, transparent); }
    .message { margin-bottom: 10px; padding: 8px 10px; border-radius: 10px; font-size: 12px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
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
    this.configureStorage();
    this.cancelInteraction();
    void this.loadStored(id);
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
    const canvas = this.renderRoot.querySelector<HTMLElement>('.canvas');
    if (canvas) this.resizeObserver.observe(canvas);
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('hass')) return;
    const changedStorage = this.configureStorage();
    if (changedStorage && this.document) void this.loadStored(this.document.id);
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.cancelInteraction();
    super.disconnectedCallback();
  }

  getCardSize(): number { return 8; }

  private configureStorage(): boolean {
    const next = createHomeAssistantDashboardStorage(this.config?.storage ?? 'local', this.hass);
    if (next.kind === this.storageKind) return false;
    this.storageController = new DashboardStorageController(next);
    this.storageKind = next.kind;
    return true;
  }

  private async loadStored(id: string): Promise<void> {
    const stored = await this.storageController.load(id);
    if (!stored || this.document?.id !== id) return;
    this.document = normalizeDashboard(stored);
  }

  private persist(document: FrakonDashboardDocument): void {
    this.document = normalizeDashboard(document);
    void this.storageController.save(this.document);
    this.dispatchEvent(new CustomEvent('frakon-layout-changed', {
      detail: { document: this.document, source: 'canvas-experimental' },
      bubbles: true,
      composed: true,
    }));
  }

  private point(event: PointerEvent): DashboardCanvasPoint {
    return { x: event.clientX, y: event.clientY };
  }

  private beginMove(event: PointerEvent, item: FrakonGridItem): void {
    if (!this.document || item.locked || this.config?.edit_mode !== true || this.session || event.button !== 0) return;
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
    if (!this.document || item.locked || this.config?.edit_mode !== true || this.session || event.button !== 0) return;
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
      this.message = 'Canvas change committed to compatible grid storage.';
    } else if (result.status === 'collision') {
      this.message = `Canvas change blocked by collision: ${result.collisionIds.join(', ')}`;
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

  render() {
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
            <span class="badge experimental">EXPERIMENTAL CANVAS</span>
            <span class="badge">v1 compatible commit</span>
          </div>
        </header>
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
