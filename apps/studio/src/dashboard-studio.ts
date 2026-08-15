import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cssRecordToString, surfaceStyleToCss } from '../../../packages/design-system/src/surface-style';
import { computeSmartGuidelines, type Guideline } from '../../../packages/studio-engine/src/guidelines';
import { previewMove, type MoveItem } from '../../../packages/studio-engine/src/move';
import {
  boundsForItems,
  resizeGroup,
  type GroupTransformItem,
  type ResizeHandle,
} from '../../../packages/studio-engine/src/resize';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import { solveDashboardConstraints } from '../../../src/dashboard/constraint-solver';
import { dashboardGridEditorShortcut } from '../../../src/dashboard/dashboard-grid-editor-shortcuts';
import { applyDashboardGridItemAction } from '../../../src/dashboard/dashboard-grid-item-actions';
import { applyDashboardGridLayerAction } from '../../../src/dashboard/dashboard-grid-layer-actions';
import { keyboardNudgeDelta, nudgeDashboardSelection } from '../../../src/dashboard/dashboard-keyboard-nudge';
import {
  clampGridItem,
  findCollisions,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from '../../../src/dashboard/layout-model';
import { resolveDashboardSurfaces, resolveGridItemSurface } from '../../../src/dashboard/surface-style-resolver';
import type { FrakonConstraintDocumentChangedDetail } from './constraint-inspector';
import type {
  FrakonStudioSelectionChangedDetail,
  FrakonStudioViewportChangedDetail,
} from './studio-canvas';
import type { FrakonStudioDocumentChangedDetail } from './surface-inspector';
import './constraint-inspector';
import './constraint-preview-bridge';
import './guideline-overlay';
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
  sourceDocument: FrakonDashboardDocument;
}

interface MoveSession {
  pointerId: number;
  startX: number;
  startY: number;
  sourceDocument: FrakonDashboardDocument;
  sourceItems: MoveItem[];
  selectedIds: string[];
}

const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const COLUMN_WIDTH = 96;
const GUIDE_THRESHOLD_SCREEN_PX = 8;

@customElement('frakon-dashboard-studio')
export class FrakonDashboardStudio extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @state() private selection: SelectionState = { ids: [] };
  @state() private viewportZoom = 1;
  @state() private resizing = false;
  @state() private moving = false;
  @state() private collisionIds: string[] = [];
  @state() private guidelines: Guideline[] = [];
  @state() private constraintPreviewVisible = true;

  private resizeSession?: ResizeSession;
  private moveSession?: MoveSession;
  private readonly windowMove = (event: PointerEvent) => this.continueMove(event);
  private readonly windowMoveEnd = (event: PointerEvent) => this.endMove(event);

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
    .inspector-stack { display:grid; gap:14px; }
    .constraint-toolbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:10px 12px;
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:14px;
      background:rgb(255 255 255 / 4%);
      font-size:12px;
    }
    .constraint-toolbar button {
      border:1px solid rgb(105 167 255 / 34%);
      border-radius:9px;
      padding:7px 10px;
      color:inherit;
      background:rgb(105 167 255 / 13%);
      cursor:pointer;
      font:inherit;
    }
    .constraint-toolbar button[aria-pressed='true'] { background:rgb(105 167 255 / 25%); }
    .item {
      position:absolute;
      box-sizing:border-box;
      overflow:hidden;
      cursor:grab;
      touch-action:none;
      transition:box-shadow 120ms ease,filter 120ms ease;
    }
    .item:active { cursor:grabbing; }
    .item.moving { filter:brightness(1.05); }
    .item.collision {
      box-shadow:0 0 0 2px #ff5c72,0 14px 42px rgb(255 36 72 / 28%) !important;
      filter:saturate(1.18);
    }
    .item-content {
      height:100%;
      box-sizing:border-box;
      display:grid;
      align-content:start;
      gap:8px;
      pointer-events:none;
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
    .selection-box.resizing,.selection-box.moving { border-style:dashed; }
    .selection-box.collision {
      border-color:#ff5c72;
      box-shadow:0 0 0 1px rgb(255 92 114 / 22%);
    }
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
    .selection-box.collision .resize-handle { border-color:#ff5c72; }
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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeMoveListeners();
  }

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
    if (this.resizing || this.moving) return;
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

  private onConstraintDocumentChanged(event: CustomEvent<FrakonConstraintDocumentChangedDetail>): void {
    this.document = event.detail.document;
    this.emitChanged();
  }

  private onStudioKeyDown(event: KeyboardEvent): void {
    if (!this.document || this.moving || this.resizing) return;
    const originalTarget = event.composedPath()[0];
    if (
      originalTarget instanceof HTMLInputElement
      || originalTarget instanceof HTMLTextAreaElement
      || originalTarget instanceof HTMLSelectElement
      || originalTarget instanceof HTMLButtonElement
      || (originalTarget instanceof HTMLElement && originalTarget.isContentEditable)
    ) return;

    const shortcut = dashboardGridEditorShortcut(event);
    if (shortcut && this.selection.ids.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      if (shortcut.kind === 'item') {
        const result = applyDashboardGridItemAction(this.document, this.selection.ids, shortcut.action);
        if (result.status === 'committed') {
          this.document = result.document;
          this.selection = { ids: result.selectedIds, anchorId: result.selectedIds[0] };
          this.collisionIds = [];
          this.guidelines = [];
          this.emitChanged();
        }
        return;
      }

      const result = applyDashboardGridLayerAction(this.document, this.selection.ids, shortcut.action);
      if (result.status === 'committed') {
        this.document = result.document;
        this.collisionIds = [];
        this.guidelines = [];
        this.emitChanged();
      }
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const delta = keyboardNudgeDelta(event.key, event.shiftKey);
    if (!delta || this.selection.ids.length === 0) return;
    event.preventDefault();
    event.stopPropagation();

    const result = nudgeDashboardSelection(this.document, this.selection.ids, delta);
    this.collisionIds = result.collisionIds;
    if (result.status === 'moved') {
      this.document = result.document;
      this.collisionIds = [];
      this.guidelines = [];
      this.emitChanged();
    }
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

  private itemToMove(item: FrakonGridItem, document: FrakonDashboardDocument): MoveItem {
    return this.itemToTransform(item, document);
  }

  private selectedTransforms(document: FrakonDashboardDocument): GroupTransformItem[] {
    const ids = new Set(this.selection.ids);
    return document.items.filter((item) => ids.has(item.id)).map((item) => this.itemToTransform(item, document));
  }

  private beginMove(event: PointerEvent, item: FrakonGridItem): void {
    if (!this.document || event.button !== 0 || this.resizing || item.locked) return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

    event.preventDefault();
    event.stopPropagation();

    const selectedIds = this.selection.ids.includes(item.id) ? [...this.selection.ids] : [item.id];
    if (!this.selection.ids.includes(item.id)) {
      this.selection = { ids: selectedIds, anchorId: item.id };
    }

    this.moveSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      sourceDocument: structuredClone(this.document),
      sourceItems: this.document.items.map((entry) => this.itemToMove(entry, this.document as FrakonDashboardDocument)),
      selectedIds,
    };
    this.moving = true;
    this.collisionIds = [];
    this.guidelines = [];
    window.addEventListener('pointermove', this.windowMove);
    window.addEventListener('pointerup', this.windowMoveEnd);
    window.addEventListener('pointercancel', this.windowMoveEnd);
  }

  private continueMove(event: PointerEvent): void {
    const session = this.moveSession;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();

    const zoom = Math.max(0.01, this.viewportZoom);
    const document = session.sourceDocument;
    const gridPreview = previewMove(session.sourceItems, session.selectedIds, {
      x: (event.clientX - session.startX) / zoom,
      y: (event.clientY - session.startY) / zoom,
    }, {
      minX: 0,
      minY: 0,
      gridX: COLUMN_WIDTH,
      gridY: document.rowHeight,
    });

    const guideSnap = computeSmartGuidelines(
      gridPreview.items,
      session.selectedIds,
      GUIDE_THRESHOLD_SCREEN_PX / zoom,
    );
    const preview = guideSnap.deltaX || guideSnap.deltaY
      ? previewMove(gridPreview.items, session.selectedIds, {
        x: guideSnap.deltaX,
        y: guideSnap.deltaY,
      }, { minX: 0, minY: 0 })
      : gridPreview;

    this.guidelines = guideSnap.guidelines;
    const byId = new Map(preview.items.map((item) => [item.id, item]));
    this.document = {
      ...document,
      items: document.items.map((item) => {
        const moved = byId.get(item.id);
        if (!moved || item.locked) return item;
        return {
          ...item,
          x: Math.max(0, Math.round(moved.x / COLUMN_WIDTH)),
          y: Math.max(0, Math.round(moved.y / document.rowHeight)),
        };
      }),
    };
    this.collisionIds = preview.collisionIds;
    this.emitChanged();
  }

  private endMove(event: PointerEvent): void {
    const session = this.moveSession;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (this.collisionIds.length > 0) this.document = session.sourceDocument;
    this.moveSession = undefined;
    this.moving = false;
    this.collisionIds = [];
    this.guidelines = [];
    this.removeMoveListeners();
    this.emitChanged();
  }

  private removeMoveListeners(): void {
    window.removeEventListener('pointermove', this.windowMove);
    window.removeEventListener('pointerup', this.windowMoveEnd);
    window.removeEventListener('pointercancel', this.windowMoveEnd);
  }

  private beginResize(event: PointerEvent, handle: ResizeHandle): void {
    if (!this.document || event.button !== 0 || this.moving) return;
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
      sourceDocument: structuredClone(this.document),
    };
    this.resizing = true;
    this.collisionIds = [];
    this.guidelines = [];
  }

  private continueResize(event: PointerEvent): void {
    const session = this.resizeSession;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const document = session.sourceDocument;
    const zoom = Math.max(0.01, this.viewportZoom);
    const resized = resizeGroup(session.source, session.handle, {
      x: (event.clientX - session.startX) / zoom,
      y: (event.clientY - session.startY) / zoom,
    }, {
      minWidth: COLUMN_WIDTH,
      minHeight: document.rowHeight,
    });
    const byId = new Map(resized.map((item) => [item.id, item]));
    const candidate: FrakonDashboardDocument = {
      ...document,
      items: document.items.map((item) => {
        const transformed = byId.get(item.id);
        if (!transformed || item.locked) return structuredClone(item);
        return clampGridItem({
          ...item,
          x: Math.round(transformed.x / COLUMN_WIDTH),
          y: Math.round(transformed.y / document.rowHeight),
          w: Math.max(1, Math.round((transformed.width + document.gap) / COLUMN_WIDTH)),
          h: Math.max(1, Math.round((transformed.height + document.gap) / document.rowHeight)),
        }, document.columns);
      }),
    };
    const collisionIds = new Set<string>();
    for (const [first, second] of findCollisions(candidate.items)) {
      collisionIds.add(first);
      collisionIds.add(second);
    }
    this.document = candidate;
    this.collisionIds = [...collisionIds];
    this.emitChanged();
  }

  private endResize(event: PointerEvent): void {
    const session = this.resizeSession;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.collisionIds.length > 0) this.document = session.sourceDocument;
    this.resizeSession = undefined;
    this.resizing = false;
    this.collisionIds = [];
    this.guidelines = [];
    this.emitChanged();
  }

  private renderSelectionBox(document: FrakonDashboardDocument) {
    const selected = this.selectedTransforms(document);
    if (selected.length === 0) return nothing;
    const bounds = boundsForItems(selected);
    const placement = `left:${bounds.x}px;top:${bounds.y}px;width:${bounds.width}px;height:${bounds.height}px`;
    const classes = [
      'selection-box',
      this.resizing ? 'resizing' : '',
      this.moving ? 'moving' : '',
      this.collisionIds.length > 0 ? 'collision' : '',
    ].filter(Boolean).join(' ');
    return html`
      <div class=${classes} style=${placement}>
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
    const collisions = new Set(this.collisionIds);
    const selected = new Set(this.selection.ids);
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
      const classes = [
        'item',
        collisions.has(item.id) ? 'collision' : '',
        this.moving && selected.has(item.id) ? 'moving' : '',
      ].filter(Boolean).join(' ');
      return html`
        <article
          class=${classes}
          data-frakon-id=${item.id}
          style=${`${placement};${surfaceCss}`}
          aria-label=${name}
          @pointerdown=${(event: PointerEvent) => this.beginMove(event, item)}
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
    const constraints = document.constraints ?? [];
    const constraintPreview = constraints.length > 0 ? solveDashboardConstraints(document).document : document;

    return html`
      <section class="studio-shell">
        <div class="canvas-pane" style=${dashboardCss}>
          <frakon-studio-canvas
            @keydown=${this.onStudioKeyDown}
            @frakon-studio-selection-changed=${this.onSelectionChanged}
            @frakon-studio-viewport-changed=${this.onViewportChanged}
          >
            ${this.renderItems(document)}
            ${this.renderSelectionBox(document)}
            <frakon-guideline-overlay .guidelines=${this.guidelines}></frakon-guideline-overlay>
          </frakon-studio-canvas>
          <frakon-constraint-preview-bridge
            .source=${document}
            .preview=${constraintPreview}
            .visible=${this.constraintPreviewVisible && constraints.length > 0}
          ></frakon-constraint-preview-bridge>
        </div>
        <aside class="inspector-pane">
          <div class="inspector-stack">
            <frakon-surface-inspector
              .document=${document}
              .selection=${this.selection}
              @frakon-studio-document-changed=${this.onDocumentChanged}
            ></frakon-surface-inspector>
            <div class="constraint-toolbar">
              <span>Constraint ghost preview</span>
              <button
                aria-pressed=${String(this.constraintPreviewVisible)}
                ?disabled=${constraints.length === 0}
                @click=${() => { this.constraintPreviewVisible = !this.constraintPreviewVisible; }}
              >${this.constraintPreviewVisible ? 'Visible' : 'Hidden'}</button>
            </div>
            <frakon-constraint-inspector
              .document=${document}
              .selection=${this.selection}
              @frakon-constraint-document-changed=${this.onConstraintDocumentChanged}
            ></frakon-constraint-inspector>
          </div>
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
