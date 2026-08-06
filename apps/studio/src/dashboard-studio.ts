import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cssRecordToString, surfaceStyleToCss } from '../../../packages/design-system/src/surface-style';
import {
  boundsForItems,
  resizeGroup,
  type GroupTransformItem,
  type ResizeHandle,
} from '../../../packages/studio-engine/src/resize';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocument, FrakonGridItem } from '../../../src/dashboard/layout-model';
import { resolveDashboardSurfaces, resolveGridItemSurface } from '../../../src/dashboard/surface-style-resolver';
import type {
  FrakonStudioSelectionChangedDetail,
  FrakonStudioViewportChangedDetail,
} from './studio-canvas';
import type { FrakonStudioDocumentChangedDetail } from './surface-inspector';
import './studio-canvas';
import './surface-inspector';

export interface FrakonDashboardStudioChangedDetail {
  document: FrakonDashboardDocument;
  selection: SelectionState;
}

interface ResizeSession {
  pointerId: number;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  source: GroupTransformItem[];
}

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-studio')
export class FrakonDashboardStudio extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @state() private selection: SelectionState = { ids: [] };
  @state() private viewportZoom = 1;
  @state() private resizing = false;

  private resizeSession?: ResizeSession;

  static styles = css`
    :host {
      display:block;
      min-height:680px;
      color:var(--primary-text-color,#f7f8fb);
      font-family:Inter,system-ui,sans-serif;
    }
    .studio-shell {
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(300px,380px);
      gap:16px;
      min-height:inherit;
    }
    .canvas-pane { min-width:0; }
    .inspector-pane {
      min-width:0;
      max-height:calc(100vh - 32px);
      overflow:auto;
      padding-right:2px;
    }
    .item {
      position:absolute;
      box-sizing:border-box;
      overflow:hidden;
      cursor:default;
    }
    .item-content {
      height:100%;
      box-sizing:border-box;
      display:grid;
      align-content:start;
      gap:8px;
    }
    .item-title { font-weight:700; }
    .item-meta { font-size:12px; opacity:.58; }
    .empty {
      position:absolute;
      left:120px;
      top:100px;
      width:380px;
      padding:24px;
      border:1px dashed rgb(255 255 255 / 18%);
      border-radius:20px;
      background:rgb(255 255 255 / 3%);
    }
    .selection-box {
      position:absolute;
      box-sizing:border-box;
      pointer-events:none;
      border:1.5px solid #69a7ff;
      border-radius:4px;
      box-shadow:0 0 0 1px rgb(105 167 255 / 18%);
      z-index:20;
    }
    .selection-box.resizing { border-style:dashed; }
    .resize-handle {
      position:absolute;
      width:12px;
      height:12px;
      box-sizing:border-box;
      border:2px solid #69a7ff;
      border-radius:3px;
      background:#f7fbff;
      pointer-events:auto;
      touch-action:none;
      transform:translate(-50%,-50%);
    }
    .resize-handle[data-handle='n'] { left:50%; top:0; cursor:ns-resize; }
    .resize-handle[data-handle='ne'] { left:100%; top:0; cursor:nesw-resize; }
    .resize-handle[data-handle='e'] { left:100%; top:50%; cursor:ew-resize; }
    .resize-handle[data-handle='se'] { left:100%; top:100%; cursor:nwse-resize; }
    .resize-handle[data-handle='s'] { left:50%; top:100%; cursor:ns-resize; }
    .resize-handle[data-handle='sw'] { left:0; top:100%; cursor:nesw-resize; }
    .resize-handle[data-handle='w'] { left:0; top:50%; cursor:ew-resize; }
    .resize-handle[data-handle='nw'] { left:0; top:0; cursor:nwse-resize; }
    @media (max-width:980px) {
      .studio-shell { grid-template-columns:1fr; }
      .inspector-pane { max-height:none; }
    }
  `;

  private emitChanged(): void {
    if (!this.document) return;
    this.dispatchEvent(new CustomEvent<FrakonDashboardStudioChangedDetail>('frakon-dashboard-studio-changed', {
      detail: {
        document: structuredClone(this.document),
        selection: structuredClone(this.selection),
      },
      bubbles: true,
      composed: true,
    }));
  }

  private onSelectionChanged(event: CustomEvent<FrakonStudioSelectionChangedDetail>): void {
    if (this.resizing) return;
    this.selection = event.detail.selection;
    this.emitChanged();
  }

  private onViewportChanged(event: CustomEvent<FrakonStudioViewportChangedDetail>): void {
    this.viewportZoom = event.detail.viewport.zoom;
  }

  private onDocumentChanged(event: CustomEvent<FrakonStudioDocumentChangedDetail>): void {
    this.document = event.detail.document;
    this.emitChanged();
  }

  private itemToTransform(item: FrakonGridItem, document: FrakonDashboardDocument): GroupTransformItem {
    return {
      id: item.id,
      x: item.x * COLUMN_WIDTH,
      y: item.y * document.rowHeight,
      width: item.w * COLUMN_WIDTH - document.gap,
      height: item.h * document.rowHeight - document.gap,
      locked: item.locked,
    };
  }

  private selectedTransforms(document: FrakonDashboardDocument): GroupTransformItem[] {
    const ids = new Set(this.selection.ids);
    return document.items.filter((item) => ids.has(item.id)).map((item) => this.itemToTransform(item, document));
  }

  private beginResize(event: PointerEvent, handle: ResizeHandle): void {
    if (!this.document || event.button !== 0) return;
    const source = this.selectedTransforms(this.document);
    if (source.length === 0 || source.every((item) => item.locked)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.resizeSession = {
      pointerId: event.pointerId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      source,
    };
    this.resizing = true;
  }

  private continueResize(event: PointerEvent): void {
    const session = this.resizeSession;
    const document = this.document;
    if (!session || !document || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const zoom = Math.max(0.01, this.viewportZoom);
    const resized = resizeGroup(session.source, session.handle, {
      x: (event.clientX - session.startX) / zoom,
      y: (event.clientY - session.startY) / zoom,
    }, {
      minWidth: COLUMN_WIDTH,
      minHeight: document.rowHeight,
    });
    const byId = new Map(resized.map((item) => [item.id, item]));
    this.document = {
      ...document,
      items: document.items.map((item) => {
        const transformed = byId.get(item.id);
        if (!transformed || item.locked) return item;
        return {
          ...item,
          x: Math.max(0, Math.round(transformed.x / COLUMN_WIDTH)),
          y: Math.max(0, Math.round(transformed.y / document.rowHeight)),
          w: Math.max(1, Math.round((transformed.width + document.gap) / COLUMN_WIDTH)),
          h: Math.max(1, Math.round((transformed.height + document.gap) / document.rowHeight)),
        };
      }),
    };
    this.emitChanged();
  }

  private endResize(event: PointerEvent): void {
    if (!this.resizeSession || this.resizeSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.resizeSession = undefined;
    this.resizing = false;
    this.emitChanged();
  }

  private renderSelectionBox(document: FrakonDashboardDocument) {
    const selected = this.selectedTransforms(document);
    if (selected.length === 0) return nothing;
    const bounds = boundsForItems(selected);
    const placement = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
    return html`
      <div class="selection-box ${this.resizing ? 'resizing' : ''}" style=${placement}>
        ${RESIZE_HANDLES.map((handle) => html`
          <span
            class="resize-handle"
            data-handle=${handle}
            @pointerdown=${(event: PointerEvent) => this.beginResize(event, handle)}
            @pointermove=${this.continueResize}
            @pointerup=${this.endResize}
            @pointercancel=${this.endResize}
          ></span>
        `)}
      </div>
    `;
  }

  private renderItems(document: FrakonDashboardDocument) {
    if (document.items.length === 0) {
      return html`<div class="empty"><strong>Empty dashboard</strong><p>Add cards to begin composing the FRAKON interface.</p></div>`;
    }

    const rowHeight = document.rowHeight;
    return document.items.map((item) => {
      const style = resolveGridItemSurface(document, item);
      const surfaceCss = cssRecordToString(surfaceStyleToCss(style));
      const placement = [
        `left:${item.x * COLUMN_WIDTH}px`,
        `top:${item.y * rowHeight}px`,
        `width:${item.w * COLUMN_WIDTH - document.gap}px`,
        `height:${item.h * rowHeight - document.gap}px`,
      ].join(';');
      const cardType = typeof item.card.type === 'string' ? item.card.type : 'card';
      const name = typeof item.card.name === 'string' ? item.card.name : item.id;
      return html`
        <article
          class="item"
          data-frakon-id=${item.id}
          style=${`${placement};${surfaceCss}`}
          aria-label=${name}
        >
          <div class="item-content">
            <span class="item-title">${name}</span>
            <span class="item-meta">${cardType} · ${item.w} × ${item.h}</span>
          </div>
        </article>
      `;
    });
  }

  render() {
    const document = this.document;
    if (!document) return html`<p>No dashboard document loaded.</p>`;
    const dashboardCss = cssRecordToString(surfaceStyleToCss(resolveDashboardSurfaces(document).dashboard));

    return html`
      <section class="studio-shell">
        <div class="canvas-pane" style=${dashboardCss}>
          <frakon-studio-canvas
            @frakon-studio-selection-changed=${this.onSelectionChanged}
            @frakon-studio-viewport-changed=${this.onViewportChanged}
          >
            ${this.renderItems(document)}
            ${this.renderSelectionBox(document)}
          </frakon-studio-canvas>
        </div>
        <aside class="inspector-pane">
          <frakon-surface-inspector
            .document=${document}
            .selection=${this.selection}
            @frakon-studio-document-changed=${this.onDocumentChanged}
          ></frakon-surface-inspector>
        </aside>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio': FrakonDashboardStudio;
  }
}
