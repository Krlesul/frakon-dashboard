import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import type { Guideline } from '../../packages/studio-engine/src/guidelines';
import type { SelectionRect, SelectionState } from '../../packages/studio-engine/src/selection';
import type { Point, Size, ViewportTransform } from '../../packages/studio-engine/src/viewport';
import type { SupportedLanguage } from '../i18n';
import type { HomeAssistant } from '../home-assistant/types';
import './card-host';
import './canvas-v2-constraint-overlay';
import type { FrakonCanvasV2ConstraintSelectDetail } from './canvas-v2-constraint-overlay';
import './canvas-v2-inspector-panel';
import type { FrakonCanvasV2InspectorEditDetail } from './canvas-v2-inspector-panel';
import './canvas-v2-viewport-toolbar';
import type { FrakonCanvasV2ViewportAction } from './canvas-v2-viewport-toolbar';
import { selectDashboardCanvasV2Constraint } from './dashboard-canvas-v2-constraint-selection';
import { dashboardCanvasV2EditorShortcut } from './dashboard-canvas-v2-editor-shortcuts';
import { dashboardCanvasV2Guidelines } from './dashboard-canvas-v2-guidelines';
import { patchDashboardCanvasV2Item, patchDashboardCanvasV2Snap } from './dashboard-canvas-v2-inspector-actions';
import { applyDashboardCanvasV2ItemAction } from './dashboard-canvas-v2-item-actions';
import { dashboardCanvasV2ItemStyle } from './dashboard-canvas-v2-item-style';
import { applyDashboardCanvasV2LayerAction } from './dashboard-canvas-v2-layer-actions';
import { DashboardCanvasV2PanSession } from './dashboard-canvas-v2-pan-session';
import { DashboardCanvasV2PinchSession } from './dashboard-canvas-v2-pinch-session';
import { canvasV2MoveSelection, normalizeCanvasV2Selection, selectCanvasV2ByMarquee, selectCanvasV2Item } from './dashboard-canvas-v2-selection';
import { DashboardCanvasV2Session, type DashboardCanvasV2Point } from './dashboard-canvas-v2-session';
import { DashboardCanvasV2ViewportController } from './dashboard-canvas-v2-viewport-controller';
import { loadDashboardCanvasV2Viewport, saveDashboardCanvasV2Viewport } from './dashboard-canvas-v2-viewport-memory';
import { dashboardCanvasV2ViewportShortcut } from './dashboard-canvas-v2-viewport-shortcuts';
import { dashboardCanvasV2WheelZoom } from './dashboard-canvas-v2-wheel-zoom';
import { keyboardNudgeDeltaV2, nudgeDashboardV2Selection } from './dashboard-keyboard-nudge-v2';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface FrakonCanvasV2DraftDetail {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
  constraintDiagnostics?: ConstraintDiagnostic[];
}

@customElement('frakon-canvas-v2-view')
export class FrakonCanvasV2View extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @property({ type: Number }) width = 1000;
  @property({ type: Boolean }) editMode = false;
  @state() private previewDocument?: FrakonDashboardDocumentV2;
  @state() private collisionIds: string[] = [];
  @state() private selection: SelectionState = { ids: [] };
  @state() private selectedConstraintId?: string;
  @state() private marqueeRect?: SelectionRect;
  @state() private guidelines: Guideline[] = [];
  @state() private constraintDiagnostics: ConstraintDiagnostic[] = [];
  @state() private viewport: ViewportTransform = { x: 0, y: 0, zoom: 1 };
  @state() private spacePressed = false;

  private session?: DashboardCanvasV2Session;
  private pointerId?: number;
  private movingIds: string[] = [];
  private marqueeStart?: DashboardCanvasV2Point;
  private marqueeBaseSelection?: SelectionState;
  private marqueePointerId?: number;
  private marqueeAdditive = false;
  private viewportController = new DashboardCanvasV2ViewportController();
  private panSession?: DashboardCanvasV2PanSession;
  private panPointerId?: number;
  private pinchSession?: DashboardCanvasV2PinchSession;
  private readonly touchPointers = new Map<number, Point>();
  private restoredViewportKey?: string;

  static styles = css`
    :host { display: block; }
    .viewport-toolbar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .canvas { position: relative; min-height: 120px; overflow: hidden; border-radius: 18px; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%); outline: none; touch-action: none; }
    .canvas:focus-visible { box-shadow: 0 0 0 2px var(--primary-color); }
    .canvas.panning { cursor: grabbing; }
    .canvas.space-ready { cursor: grab; }
    .stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; will-change: transform; }
    .item { position: absolute; min-width: 0; min-height: 0; overflow: hidden; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background: var(--card-background-color); box-sizing: border-box; }
    .item.selected { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .item.collision { outline: 2px solid #ff4d67; outline-offset: 2px; }
    .head { position: absolute; z-index: 5; top: 5px; left: 5px; right: 5px; pointer-events: none; }
    .move { pointer-events: auto; border: 0; border-radius: 8px; padding: 5px 7px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 82%, var(--primary-color) 18%); cursor: grab; touch-action: none; }
    .move:active { cursor: grabbing; }
    .resize { position: absolute; z-index: 6; right: 4px; bottom: 4px; width: 18px; height: 18px; border: 0; border-radius: 6px; padding: 0; cursor: nwse-resize; touch-action: none; background: color-mix(in srgb, var(--primary-color) 72%, transparent); }
    .marquee { position: absolute; z-index: 20; pointer-events: none; border: 1px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 14%, transparent); box-sizing: border-box; }
    .guideline { position: absolute; z-index: 19; pointer-events: none; background: var(--primary-color); opacity: .82; box-shadow: 0 0 7px color-mix(in srgb, var(--primary-color) 55%, transparent); }
    .guideline.x { top: 0; bottom: 0; width: 1px; }
    .guideline.y { left: 0; right: 0; height: 1px; }
    .content { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  `;

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('document') || changed.has('editMode')) this.restoreViewportMemory();
  }

  private canvasElement(): HTMLElement | undefined { return this.renderRoot.querySelector<HTMLElement>('.canvas') ?? undefined; }

  private localPoint(clientX: number, clientY: number): Point {
    const rect = this.canvasElement()?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }

  private documentPoint(event: PointerEvent): DashboardCanvasV2Point {
    return this.viewportController.screenToDocument(this.localPoint(event.clientX, event.clientY));
  }

  private contentHeight(document: FrakonDashboardDocumentV2): number {
    return Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height), 1);
  }

  private viewportHeight(document: FrakonDashboardDocumentV2): number {
    return Math.min(680, Math.max(320, this.contentHeight(document)));
  }

  private viewportSize(document: FrakonDashboardDocumentV2): Size {
    const rect = this.canvasElement()?.getBoundingClientRect();
    return { width: Math.max(1, rect?.width ?? this.width), height: Math.max(1, rect?.height ?? this.viewportHeight(document)) };
  }

  private viewportMemoryKey(): string | undefined {
    return this.document ? `${this.document.id}:${this.document.breakpoint}` : undefined;
  }

  private restoreViewportMemory(): void {
    if (!this.editMode || !this.document || typeof localStorage === 'undefined') return;
    const key = this.viewportMemoryKey();
    if (!key || key === this.restoredViewportKey) return;
    this.restoredViewportKey = key;
    const restored = loadDashboardCanvasV2Viewport(localStorage, this.document.id, this.document.breakpoint);
    this.viewportController = new DashboardCanvasV2ViewportController(restored);
    this.viewport = this.viewportController.snapshot();
  }

  private syncViewport(next: ViewportTransform): void {
    this.viewport = next;
    if (this.editMode && this.document && typeof localStorage !== 'undefined') {
      saveDashboardCanvasV2Viewport(localStorage, this.document.id, this.document.breakpoint, next);
    }
  }

  private fitViewport(): void {
    if (this.document) this.syncViewport(this.viewportController.fit(this.document, this.viewportSize(this.document)));
  }

  private resetViewport(): void { this.syncViewport(this.viewportController.reset()); }

  private onViewportAction(event: CustomEvent<FrakonCanvasV2ViewportAction>): void {
    if (!this.document) return;
    event.stopPropagation();
    if (event.detail.kind === 'fit') return this.fitViewport();
    if (event.detail.kind === 'reset') return this.resetViewport();
    const size = this.viewportSize(this.document);
    this.syncViewport(this.viewportController.zoomAt({ x: size.width / 2, y: size.height / 2 }, event.detail.zoom));
  }

  private onWheel(event: WheelEvent): void {
    if (!this.editMode || !this.document || event.target !== event.currentTarget) return;
    const nextZoom = dashboardCanvasV2WheelZoom({ deltaY: event.deltaY, ctrlKey: event.ctrlKey, metaKey: event.metaKey, currentZoom: this.viewport.zoom });
    if (nextZoom === undefined) return;
    event.preventDefault();
    this.syncViewport(this.viewportController.zoomAt(this.localPoint(event.clientX, event.clientY), nextZoom));
  }

  private dispatchDraft(detail: FrakonCanvasV2DraftDetail): void {
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2DraftDetail>('frakon-canvas-v2-draft', { detail, bubbles: true, composed: true }));
  }

  private selectItem(event: MouseEvent, item: FrakonCanvasItem): void {
    this.selectedConstraintId = undefined;
    this.selection = selectCanvasV2Item(this.selection, item.id, { shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey });
  }

  private onConstraintSelect(event: CustomEvent<FrakonCanvasV2ConstraintSelectDetail>): void {
    if (!this.editMode || !this.document || this.session || this.marqueeStart || this.panSession || this.pinchSession) return;
    event.stopPropagation();
    const next = selectDashboardCanvasV2Constraint(this.document, event.detail.constraintId);
    if (!next) return;
    this.selectedConstraintId = next.constraintId;
    this.selection = next.selection;
    this.canvasElement()?.focus();
  }

  private onSelectionSet(event: CustomEvent<{ selectedIds: string[] }>): void {
    event.stopPropagation();
    const ids = event.detail.selectedIds.filter((id) => this.document?.items.some((item) => item.id === id));
    this.selectedConstraintId = undefined;
    this.selection = { ids, anchorId: ids[0] };
    this.canvasElement()?.focus();
  }

  private onInspectorEdit(event: CustomEvent<FrakonCanvasV2InspectorEditDetail>): void {
    if (!this.editMode || !this.document || this.session || this.marqueeStart || this.panSession || this.pinchSession) return;
    const edit = event.detail;
    const result = edit.kind === 'item' ? patchDashboardCanvasV2Item(this.document, edit.itemId, edit.patch) : patchDashboardCanvasV2Snap(this.document, edit.patch);
    this.collisionIds = result.collisionIds;
    this.constraintDiagnostics = result.constraintDiagnostics;
    this.dispatchDraft({ status: result.status === 'missing-item' ? 'unchanged' : result.status, document: result.document, collisionIds: result.collisionIds, constraintDiagnostics: result.constraintDiagnostics });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.editMode || !this.document || event.target !== event.currentTarget) return;
    if (event.code === 'Space' && !this.session && !this.marqueeStart && !this.pinchSession) {
      event.preventDefault();
      this.spacePressed = true;
      return;
    }
    if (this.session || this.marqueeStart || this.panSession || this.pinchSession) return;

    const viewportShortcut = dashboardCanvasV2ViewportShortcut(event);
    if (viewportShortcut) {
      event.preventDefault();
      event.stopPropagation();
      if (viewportShortcut.kind === 'fit') this.fitViewport(); else this.resetViewport();
      return;
    }

    const selection = normalizeCanvasV2Selection(this.selection, this.document);
    if (!selection.ids.length) return;
    const shortcut = dashboardCanvasV2EditorShortcut(event);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      if (shortcut.kind === 'item') {
        const result = applyDashboardCanvasV2ItemAction(this.document, selection.ids, shortcut.action);
        if (result.status === 'committed') {
          this.selection = { ids: result.selectedIds, anchorId: result.selectedIds[0] };
          this.selectedConstraintId = undefined;
          this.dispatchDraft({ status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] });
        }
        return;
      }
      const result = applyDashboardCanvasV2LayerAction(this.document, selection.ids, shortcut.action);
      if (result.status === 'committed') this.dispatchDraft({ status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] });
      return;
    }

    const delta = keyboardNudgeDeltaV2(event.key, this.document.layout.snap.size, event.shiftKey);
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const result = nudgeDashboardV2Selection(this.document, selection.ids, delta);
    this.collisionIds = result.collisionIds;
    this.constraintDiagnostics = result.constraintDiagnostics;
    this.dispatchDraft({ status: result.status === 'moved' ? 'committed' : result.status, document: result.document, collisionIds: result.collisionIds, constraintDiagnostics: result.constraintDiagnostics });
  }

  private onKeyUp(event: KeyboardEvent): void { if (event.code === 'Space') this.spacePressed = false; }

  private onCanvasPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      this.touchPointers.set(event.pointerId, this.localPoint(event.clientX, event.clientY));
      if (this.touchPointers.size >= 2) {
        const [first, second] = [...this.touchPointers.values()].slice(0, 2);
        this.clearPointerInteraction();
        this.clearMarquee(true);
        this.panSession = undefined;
        this.panPointerId = undefined;
        this.pinchSession = new DashboardCanvasV2PinchSession({ first, second, viewport: this.viewport });
        event.preventDefault();
        event.stopPropagation();
        this.canvasElement()?.setPointerCapture?.(event.pointerId);
      }
      return;
    }
    this.beginPan(event);
  }

  private beginPan(event: PointerEvent): void {
    if (!this.editMode || this.panSession || this.session || this.marqueeStart || this.pinchSession) return;
    const allowed = event.button === 1 || (event.button === 0 && this.spacePressed);
    if (!allowed) return;
    event.preventDefault(); event.stopPropagation(); this.canvasElement()?.focus();
    this.panSession = new DashboardCanvasV2PanSession({ point: { x: event.clientX, y: event.clientY }, viewport: this.viewport });
    this.panPointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginMove(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || this.marqueeStart || this.panSession || this.pinchSession || event.button !== 0 || this.spacePressed) return;
    event.preventDefault(); event.stopPropagation(); this.canvasElement()?.focus(); this.selectedConstraintId = undefined;
    const nextSelection = this.selection.ids.includes(item.id) ? normalizeCanvasV2Selection(this.selection, this.document) : selectCanvasV2Item(this.selection, item.id);
    this.selection = nextSelection;
    const selectedIds = canvasV2MoveSelection(nextSelection, item.id, this.document);
    if (!selectedIds.length) return;
    this.movingIds = [...selectedIds];
    this.session = new DashboardCanvasV2Session(this.document, { kind: 'move', selectedIds }, this.documentPoint(event));
    this.pointerId = event.pointerId; this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginResize(event: PointerEvent, item: FrakonCanvasItem): void {
    if (!this.editMode || !this.document || item.locked || this.session || this.marqueeStart || this.panSession || this.pinchSession || event.button !== 0 || this.spacePressed) return;
    event.preventDefault(); event.stopPropagation(); this.canvasElement()?.focus(); this.selectedConstraintId = undefined;
    this.selection = selectCanvasV2Item(this.selection, item.id);
    this.movingIds = []; this.guidelines = [];
    this.session = new DashboardCanvasV2Session(this.document, { kind: 'resize', itemId: item.id, handle: 'se' }, this.documentPoint(event));
    this.pointerId = event.pointerId; this.updatePreview(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private beginMarquee(event: PointerEvent): void {
    if (!this.editMode || !this.document || this.session || this.marqueeStart || this.panSession || this.pinchSession || this.spacePressed || event.button !== 0 || event.target !== event.currentTarget) return;
    event.preventDefault(); this.canvasElement()?.focus(); this.selectedConstraintId = undefined;
    const start = this.documentPoint(event);
    this.marqueeStart = start; this.marqueeBaseSelection = structuredClone(this.selection); this.marqueePointerId = event.pointerId;
    this.marqueeAdditive = event.shiftKey || event.ctrlKey || event.metaKey;
    this.marqueeRect = { x: start.x, y: start.y, width: 0, height: 0 };
    if (!this.marqueeAdditive) this.selection = { ids: [] };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private updatePreview(event: PointerEvent): void {
    if (!this.session || this.pointerId !== event.pointerId) return;
    const preview = this.session.preview(this.documentPoint(event));
    this.previewDocument = preview.document; this.collisionIds = preview.collisionIds; this.constraintDiagnostics = preview.constraintDiagnostics;
    this.guidelines = this.movingIds.length ? dashboardCanvasV2Guidelines(preview.document, this.movingIds) : [];
  }

  private updateMarquee(event: PointerEvent): void {
    if (!this.document || !this.marqueeStart || this.marqueePointerId !== event.pointerId) return;
    const current = this.documentPoint(event);
    const rect: SelectionRect = { x: this.marqueeStart.x, y: this.marqueeStart.y, width: current.x - this.marqueeStart.x, height: current.y - this.marqueeStart.y };
    this.marqueeRect = rect;
    this.selection = selectCanvasV2ByMarquee(this.document, rect, this.marqueeBaseSelection ?? { ids: [] }, this.marqueeAdditive);
  }

  private updatePinch(event: PointerEvent): boolean {
    if (event.pointerType !== 'touch' || !this.touchPointers.has(event.pointerId)) return false;
    this.touchPointers.set(event.pointerId, this.localPoint(event.clientX, event.clientY));
    if (!this.pinchSession || this.touchPointers.size < 2) return false;
    const [first, second] = [...this.touchPointers.values()].slice(0, 2);
    this.syncViewport(this.pinchSession.preview(first, second));
    return true;
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.updatePinch(event)) { event.preventDefault(); return; }
    if (this.panSession && this.panPointerId === event.pointerId) { event.preventDefault(); this.syncViewport(this.panSession.preview({ x: event.clientX, y: event.clientY })); return; }
    if (this.session && this.pointerId === event.pointerId) { event.preventDefault(); this.updatePreview(event); return; }
    if (this.marqueeStart && this.marqueePointerId === event.pointerId) { event.preventDefault(); this.updateMarquee(event); }
  }

  private endTouch(event: PointerEvent): boolean {
    if (event.pointerType !== 'touch' || !this.touchPointers.has(event.pointerId)) return false;
    this.touchPointers.delete(event.pointerId);
    if (this.touchPointers.size < 2) this.pinchSession = undefined;
    return true;
  }

  private endInteraction(event: PointerEvent): void {
    if (this.endTouch(event)) return;
    if (this.panSession && this.panPointerId === event.pointerId) {
      event.preventDefault(); this.syncViewport(this.panSession.preview({ x: event.clientX, y: event.clientY })); this.panSession = undefined; this.panPointerId = undefined; return;
    }
    if (this.session && this.pointerId === event.pointerId) {
      event.preventDefault(); const result = this.session.commit(this.documentPoint(event));
      this.clearPointerInteraction(); this.constraintDiagnostics = result.constraintDiagnostics; this.dispatchDraft(result); return;
    }
    if (this.marqueeStart && this.marqueePointerId === event.pointerId) { event.preventDefault(); this.updateMarquee(event); this.clearMarquee(false); }
  }

  private cancelInteraction(event?: PointerEvent): void {
    if (event?.pointerType === 'touch') this.touchPointers.delete(event.pointerId);
    if (this.touchPointers.size < 2) this.pinchSession = undefined;
    this.panSession = undefined; this.panPointerId = undefined; this.clearPointerInteraction(); this.clearMarquee(true);
  }

  private clearPointerInteraction(): void { this.session = undefined; this.pointerId = undefined; this.previewDocument = undefined; this.collisionIds = []; this.movingIds = []; this.guidelines = []; }
  private clearMarquee(restore: boolean): void { if (restore && this.marqueeBaseSelection) this.selection = this.marqueeBaseSelection; this.marqueeStart = undefined; this.marqueeBaseSelection = undefined; this.marqueePointerId = undefined; this.marqueeAdditive = false; this.marqueeRect = undefined; }

  private marqueeStyle(): string | undefined {
    if (!this.marqueeRect) return undefined;
    const x2 = this.marqueeRect.x + this.marqueeRect.width; const y2 = this.marqueeRect.y + this.marqueeRect.height;
    return `left:${Math.min(this.marqueeRect.x, x2)}px;top:${Math.min(this.marqueeRect.y, y2)}px;width:${Math.abs(this.marqueeRect.width)}px;height:${Math.abs(this.marqueeRect.height)}px`;
  }

  private renderedGuidelines(): Guideline[] {
    const seen = new Set<string>();
    return this.guidelines.filter((guideline) => { const key = `${guideline.axis}:${Math.round(guideline.position * 10) / 10}`; if (seen.has(key)) return false; seen.add(key); return true; });
  }

  render() {
    const source = this.previewDocument ?? this.document;
    if (!source) return nothing;
    const normalizedSelection = normalizeCanvasV2Selection(this.selection, source);
    const collisions = new Set(this.collisionIds);
    const selectedIds = new Set(normalizedSelection.ids);
    const guidelines = this.renderedGuidelines();
    const stageHeight = this.contentHeight(source);
    const readOnlyZoom = Math.max(1, this.width) / Math.max(1, source.layout.width);
    const effectiveViewport = this.editMode ? this.viewport : { x: 0, y: 0, zoom: readOnlyZoom };
    const canvasHeight = this.editMode ? this.viewportHeight(source) : Math.max(120, stageHeight * readOnlyZoom);
    const stageStyle = `width:${source.layout.width}px;height:${stageHeight}px;transform:translate(${effectiveViewport.x}px, ${effectiveViewport.y}px) scale(${effectiveViewport.zoom})`;

    return html`
      ${this.editMode ? html`<div class="viewport-toolbar"><frakon-canvas-v2-viewport-toolbar .zoom=${this.viewport.zoom} .language=${this.language} @frakon-canvas-v2-viewport-action=${this.onViewportAction}></frakon-canvas-v2-viewport-toolbar></div>` : nothing}
      <div class="canvas ${this.panSession || this.pinchSession ? 'panning' : ''} ${this.spacePressed ? 'space-ready' : ''}" tabindex=${this.editMode ? '0' : '-1'} style=${`height:${canvasHeight}px`} @keydown=${this.onKeyDown} @keyup=${this.onKeyUp} @wheel=${this.onWheel} @pointerdown=${this.onCanvasPointerDown} @pointermove=${this.onPointerMove} @pointerup=${this.endInteraction} @pointercancel=${this.cancelInteraction}>
        <div class="stage" style=${stageStyle} @pointerdown=${this.beginMarquee}>
          ${source.items.map((item) => html`<article class="item ${selectedIds.has(item.id) ? 'selected' : ''} ${collisions.has(item.id) ? 'collision' : ''}" data-frakon-item-id=${item.id} style=${dashboardCanvasV2ItemStyle(source, item)} @click=${(event: MouseEvent) => this.selectItem(event, item)}>
            ${this.editMode ? html`<div class="head"><button class="move" ?disabled=${item.locked} @click=${(event: MouseEvent) => event.stopPropagation()} @pointerdown=${(event: PointerEvent) => this.beginMove(event, item)}>↕ ${item.id}</button></div>${!item.locked ? html`<button class="resize" title="Resize" @click=${(event: MouseEvent) => event.stopPropagation()} @pointerdown=${(event: PointerEvent) => this.beginResize(event, item)}></button>` : nothing}` : nothing}
            <div class="content"><frakon-card-host .hass=${this.hass} .config=${item.card}></frakon-card-host></div>
          </article>`)}
          ${this.editMode ? html`<frakon-canvas-v2-constraint-overlay .document=${source} .selectedIds=${normalizedSelection.ids} .selectedConstraintId=${this.selectedConstraintId} @frakon-canvas-v2-constraint-select=${this.onConstraintSelect}></frakon-canvas-v2-constraint-overlay>` : nothing}
          ${guidelines.map((guideline) => html`<div class="guideline ${guideline.axis}" style=${guideline.axis === 'x' ? `left:${guideline.position}px` : `top:${guideline.position}px`}></div>`)}
          ${this.marqueeStyle() ? html`<div class="marquee" style=${this.marqueeStyle()}></div>` : nothing}
        </div>
      </div>
      ${this.editMode ? html`<frakon-canvas-v2-inspector-panel .document=${source} .selectedIds=${normalizedSelection.ids} .selectedConstraintId=${this.selectedConstraintId} .diagnostics=${this.constraintDiagnostics} .language=${this.language} @frakon-canvas-v2-inspector-edit=${this.onInspectorEdit} @frakon-canvas-v2-selection-set=${this.onSelectionSet}></frakon-canvas-v2-inspector-panel>` : nothing}
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-view': FrakonCanvasV2View; } }
