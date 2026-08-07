import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import './card-host';
import {
  DashboardCanvasV2Session,
  type DashboardCanvasV2Point,
} from './dashboard-canvas-v2-session';
import { dashboardCanvasRenderModel } from './dashboard-canvas-render-model';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface FrakonCanvasV2DraftDetail {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
}

@customElement('frakon-canvas-v2-view')
export class FrakonCanvasV2View extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ type: Number }) width = 1000;
  @property({ type: Boolean }) editMode = false;
  @state() private previewDocument?: FrakonDashboardDocumentV2;
  @state() private collisionIds: string[] = [];
  @state() private selectedId?: string;

  private session?: DashboardCanvasV2Session;
  private pointerId?: number;

  static styles = css`
    :host { display: block; }
    .canvas { position: relative; min-height: 120px; overflow: hidden; border-radius: 18px; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%); }
    .item { position: absolute; min-width: 0; min-height: 0; overflow: hidden; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background: var(--card-background-color); box-sizing: border-box; }
    .item.selected { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .item.collision { outline: 2px solid #ff4d67; outline-offset: 2px; }
    .head { position: absolute; z-index: 5; top: 5px; left: 5px; right: 5px; pointer-events: none; }
    .move { pointer-events: auto; border: 0; border-radius: 8px; padding: 5px 7px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 82%, var(--primary-color) 18%); cursor: grab; touch-action: none; }
    .move:active { cursor: grabbing; }
    .resize { position: absolute; z-index: 6; right: 4px; bottom: 4px; width: 18px; height: 18px; border: 0; border-radius: 6px; padding: 0; cursor: nwse-resize; touch-action: none; background: color-mix(in srgb, var(--primary-color) 72%, transparent); }
    .content { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  `;

  private documentPoint(event: PointerEvent): DashboardCanvasV2Point {
    const sourceWidth = Math.max(1, this.document?.layout.width ?? this.width);
    const scale = sourceWidth / Math.max(1, this.width);
    return { x: event.clientX * scale, y: event.clientY * scale };
  }

  private beginMove(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedId = item.id;
    this.session = new DashboardCanvasV2Session(
      this.document,
      { kind: 'move', selectedIds: [item.id] },
      this.documentPoint(event),
    );
    this.pointerId = event.pointerId;
    this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginResize(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedId = item.id;
    this.session = new DashboardCanvasV2Session(
      this.document,
      { kind: 'resize', itemId: item.id, handle: 'se' },
      this.documentPoint(event),
    );
    this.pointerId = event.pointerId;
    this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private updatePreview(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    const preview = this.session.preview(this.documentPoint(event));
    this.previewDocument = preview.document;
    this.collisionIds = preview.collisionIds;
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.updatePreview(event);
  }

  private endInteraction(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    event.preventDefault();
    const result = this.session.commit(this.documentPoint(event));
    this.clearInteraction();
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2DraftDetail>('frakon-canvas-v2-draft', {
      detail: result,
      bubbles: true,
      composed: true,
    }));
  }

  private cancelInteraction(): void {
    this.clearInteraction();
  }

  private clearInteraction(): void {
    this.session = undefined;
    this.pointerId = undefined;
    this.previewDocument = undefined;
    this.collisionIds = [];
  }

  render() {
    const source = this.previewDocument ?? this.document;
    if (!source) return nothing;
    const model = dashboardCanvasRenderModel(source, Math.max(1, this.width));
    const sourceById = new Map(source.items.map((item) => [item.id, item]));
    const collisions = new Set(this.collisionIds);
    return html`
      <div
        class="canvas"
        style=${`height:${model.minHeight}px`}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.endInteraction}
        @pointercancel=${this.cancelInteraction}
      >
        ${model.items.map((item) => {
          const sourceItem = sourceById.get(item.id);
          if (!sourceItem) return nothing;
          return html`
            <article
              class="item ${this.selectedId === item.id ? 'selected' : ''} ${collisions.has(item.id) ? 'collision' : ''}"
              data-frakon-item-id=${item.id}
              style=${`left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px`}
              @click=${() => { this.selectedId = item.id; }}
            >
              ${this.editMode ? html`
                <div class="head">
                  <button class="move" ?disabled=${sourceItem.locked} @pointerdown=${(event: PointerEvent) => this.beginMove(event, sourceItem)}>↕ ${item.id}</button>
                </div>
                ${!sourceItem.locked
                  ? html`<button class="resize" title="Resize" @pointerdown=${(event: PointerEvent) => this.beginResize(event, sourceItem)}></button>`
                  : nothing}
              ` : nothing}
              <div class="content"><frakon-card-host .hass=${this.hass} .config=${item.card}></frakon-card-host></div>
            </article>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-view': FrakonCanvasV2View;
  }
}
