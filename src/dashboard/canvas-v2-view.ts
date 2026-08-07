import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SelectionRect, SelectionState } from '../../packages/studio-engine/src/selection';
import type { HomeAssistant } from '../home-assistant/types';
import './card-host';
import {
  canvasV2MoveSelection,
  normalizeCanvasV2Selection,
  selectCanvasV2ByMarquee,
  selectCanvasV2Item,
} from './dashboard-canvas-v2-selection';
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
  @state() private selection: SelectionState = { ids: [] };
  @state() private marqueeRect?: SelectionRect;

  private session?: DashboardCanvasV2Session;
  private pointerId?: number;
  private marqueeStart?: DashboardCanvasV2Point;
  private marqueeBaseSelection?: SelectionState;
  private marqueePointerId?: number;
  private marqueeAdditive = false;

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
    .marquee { position: absolute; z-index: 20; pointer-events: none; border: 1px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 14%, transparent); }
    .content { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  `;

  private canvasElement(): HTMLElement | undefined {
    return this.renderRoot.querySelector<HTMLElement>('.canvas') ?? undefined;
  }

  private documentPoint(event: PointerEvent): DashboardCanvasV2Point {
    const sourceWidth = Math.max(1, this.document?.layout.width ?? this.width);
    const canvas = this.canvasElement();
    const rect = canvas?.getBoundingClientRect();
    const renderedWidth = Math.max(1, rect?.width ?? this.width);
    const scale = sourceWidth / renderedWidth;
    return {
      x: (event.clientX - (rect?.left ?? 0)) * scale,
      y: (event.clientY - (rect?.top ?? 0)) * scale,
    };
  }

  private selectItem(event: MouseEvent, item: FrakonCanvasItem): void {
    this.selection = selectCanvasV2Item(this.selection, item.id, {
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
  }

  private beginMove(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || this.marqueeStart || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const nextSelection = this.selection.ids.includes(item.id)
      ? normalizeCanvasV2Selection(this.selection, this.document)
      : selectCanvasV2Item(this.selection, item.id);
    this.selection = nextSelection;
    const selectedIds = canvasV2MoveSelection(nextSelection, item.id, this.document);
    if (!selectedIds.length) return;
    this.session = new DashboardCanvasV2Session(
      this.document,
      { kind: 'move', selectedIds },
      this.documentPoint(event),
    );
    this.pointerId = event.pointerId;
    this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginResize(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || this.marqueeStart || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.selection = selectCanvasV2Item(this.selection, item.id);
    this.session = new DashboardCanvasV2Session(
      this.document,
      { kind: 'resize', itemId: item.id, handle: 'se' },
      this.documentPoint(event),
    );
    this.pointerId = event.pointerId;
    this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginMarquee(event: PointerEvent): void {
    if (!this.editMode || !this.document || this.session || this.marqueeStart || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault();
    const start = this.documentPoint(event);
    this.marqueeStart = start;
    this.marqueeBaseSelection = structuredClone(this.selection);
    this.marqueePointerId = event.pointerId;
    this.marqueeAdditive = event.shiftKey || event.ctrlKey || event.metaKey;
    this.marqueeRect = { x: start.x, y: start.y, width: 0, height: 0 };
    if (!this.marqueeAdditive) this.selection = { ids: [] };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private updatePreview(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    const preview = this.session.preview(this.documentPoint(event));
    this.previewDocument = preview.document;
    this.collisionIds = preview.collisionIds;
  }

  private updateMarquee(event: PointerEvent): void {
    if (!this.document || !this.marqueeStart || this.marqueePointerId !== event.pointerId) return;
    const current = this.documentPoint(event);
    const rect: SelectionRect = {
      x: this.marqueeStart.x,
      y: this.marqueeStart.y,
      width: current.x - this.marqueeStart.x,
      height: current.y - this.marqueeStart.y,
    };
    this.marqueeRect = rect;
    this.selection = selectCanvasV2ByMarquee(
      this.document,
      rect,
      this.marqueeBaseSelection ?? { ids: [] },
      this.marqueeAdditive,
    );
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.session && this.pointerId === event.pointerId) {
      event.preventDefault();
      this.updatePreview(event);
      return;
    }
    if (this.marqueeStart && this.marqueePointerId === event.pointerId) {
      event.preventDefault();
      this.updateMarquee(event);
    }
  }

  private endInteraction(event: PointerEvent): void {
    if (this.session && this.pointerId === event.pointerId) {
      event.preventDefault();
      const result = this.session.commit(this.documentPoint(event));
      this.clearPointerInteraction();
      this.dispatchEvent(new CustomEvent<FrakonCanvasV2DraftDetail>('frakon-canvas-v2-draft', {
        detail: result,
        bubbles: true,
        composed: true,
      }));
      return;
    }
    if (this.marqueeStart && this.marqueePointerId === event.pointerId) {
      event.preventDefault();
      this.updateMarquee(event);
      this.clearMarquee(false);
    }
  }

  private cancelInteraction(): void {
    this.clearPointerInteraction();
    this.clearMarquee(true);
  }

  private clearPointerInteraction(): void {
    this.session = undefined;
    this.pointerId = undefined;
    this.previewDocument = undefined;
    this.collisionIds = [];
  }

  private clearMarquee(restore: boolean): void {
    if (restore && this.marqueeBaseSelection) this.selection = this.marqueeBaseSelection;
    this.marqueeStart = undefined;
    this.marqueeBaseSelection = undefined;
    this.marqueePointerId = undefined;
    this.marqueeAdditive = false;
    this.marqueeRect = undefined;
  }

  private marqueeStyle(document: FrakonDashboardDocumentV2): string | undefined {
    if (!this.marqueeRect) return undefined;
    const scale = Math.max(1, this.width) / Math.max(1, document.layout.width);
    const x2 = this.marqueeRect.x + this.marqueeRect.width;
    const y2 = this.marqueeRect.y + this.marqueeRect.height;
    const left = Math.min(this.marqueeRect.x, x2) * scale;
    const top = Math.min(this.marqueeRect.y, y2) * scale;
    const width = Math.abs(this.marqueeRect.width) * scale;
    const height = Math.abs(this.marqueeRect.height) * scale;
    return `left:${left}px;top:${top}px;width:${width}px;height:${height}px`;
  }

  render() {
    const source = this.previewDocument ?? this.document;
    if (!source) return nothing;
    const normalizedSelection = normalizeCanvasV2Selection(this.selection, source);
    const model = dashboardCanvasRenderModel(source, Math.max(1, this.width));
    const sourceById = new Map(source.items.map((item) => [item.id, item]));
    const collisions = new Set(this.collisionIds);
    const selectedIds = new Set(normalizedSelection.ids);
    return html`
      <div
        class="canvas"
        style=${`height:${model.minHeight}px`}
        @pointerdown=${this.beginMarquee}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.endInteraction}
        @pointercancel=${this.cancelInteraction}
      >
        ${model.items.map((item) => {
          const sourceItem = sourceById.get(item.id);
          if (!sourceItem) return nothing;
          return html`
            <article
              class="item ${selectedIds.has(item.id) ? 'selected' : ''} ${collisions.has(item.id) ? 'collision' : ''}"
              data-frakon-item-id=${item.id}
              style=${`left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px`}
              @click=${(event: MouseEvent) => this.selectItem(event, sourceItem)}
            >
              ${this.editMode ? html`
                <div class="head">
                  <button
                    class="move"
                    ?disabled=${sourceItem.locked}
                    @click=${(event: MouseEvent) => event.stopPropagation()}
                    @pointerdown=${(event: PointerEvent) => this.beginMove(event, sourceItem)}
                  >↕ ${item.id}</button>
                </div>
                ${!sourceItem.locked
                  ? html`<button
                      class="resize"
                      title="Resize"
                      @click=${(event: MouseEvent) => event.stopPropagation()}
                      @pointerdown=${(event: PointerEvent) => this.beginResize(event, sourceItem)}
                    ></button>`
                  : nothing}
              ` : nothing}
              <div class="content"><frakon-card-host .hass=${this.hass} .config=${item.card}></frakon-card-host></div>
            </article>
          `;
        })}
        ${this.marqueeStyle(source) ? html`<div class="marquee" style=${this.marqueeStyle(source)}></div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-view': FrakonCanvasV2View;
  }
}
