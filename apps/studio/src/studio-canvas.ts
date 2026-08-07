import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DEFAULT_VIEWPORT,
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  normalizeViewport,
  panViewport,
  resetViewport,
  screenToCanvas,
  zoomViewportAt,
  type Point,
  type ViewportTransform,
} from '../../../packages/studio-engine/src/viewport';
import {
  EMPTY_SELECTION,
  clearSelection,
  selectByMarquee,
  selectOnly,
  toggleSelection,
  addToSelection,
  replaceSelection,
  type SelectableItem,
  type SelectionRect,
  type SelectionState,
} from '../../../packages/studio-engine/src/selection';

export interface FrakonStudioViewportChangedDetail {
  viewport: ViewportTransform;
}

export interface FrakonStudioSelectionChangedDetail {
  selection: SelectionState;
}

interface PointerGesture {
  mode: 'pan' | 'marquee';
  pointerId: number;
  startScreen: Point;
  currentScreen: Point;
  additive: boolean;
}

@customElement('frakon-studio-canvas')
export class FrakonStudioCanvas extends LitElement {
  @property({ attribute: false }) viewport: ViewportTransform = { ...DEFAULT_VIEWPORT };
  @property({ attribute: false }) selection: SelectionState = { ...EMPTY_SELECTION };
  @property({ type: Boolean }) interactive = true;
  @state() private gesture?: PointerGesture;

  static styles = css`
    :host {
      display: block;
      min-height: 560px;
      color: var(--primary-text-color, #f7f8fb);
      font-family: var(--paper-font-body1_-_font-family, Inter, system-ui, sans-serif);
    }

    .studio {
      position: relative;
      min-height: inherit;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
      border-radius: 24px;
      background: #111319;
      touch-action: none;
      user-select: none;
      outline: none;
    }

    .studio:focus-visible {
      box-shadow: 0 0 0 2px #69a7ff inset;
    }

    .toolbar {
      position: absolute;
      z-index: 4;
      top: 14px;
      left: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px;
      border: 1px solid color-mix(in srgb, white 10%, transparent);
      border-radius: 14px;
      background: color-mix(in srgb, #171a22 88%, transparent);
      box-shadow: 0 12px 34px rgb(0 0 0 / 28%);
      backdrop-filter: blur(18px);
    }

    button,
    output {
      min-width: 40px;
      border: 0;
      border-radius: 9px;
      padding: 7px 10px;
      color: inherit;
      background: color-mix(in srgb, white 8%, transparent);
      font: inherit;
      font-size: 12px;
    }

    button { cursor: pointer; }
    button:hover { background: color-mix(in srgb, white 14%, transparent); }
    output { text-align: center; font-variant-numeric: tabular-nums; }

    .viewport {
      position: absolute;
      inset: 0;
      cursor: default;
    }

    .viewport.panning { cursor: grabbing; }
    .viewport.marquee-selecting { cursor: crosshair; }

    .world {
      position: absolute;
      width: 3200px;
      height: 2200px;
      transform-origin: 0 0;
      background-color: #171a22;
      background-image:
        linear-gradient(color-mix(in srgb, white 5%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, white 5%, transparent) 1px, transparent 1px),
        linear-gradient(color-mix(in srgb, white 9%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, white 9%, transparent) 1px, transparent 1px);
      background-size: 16px 16px, 16px 16px, 80px 80px, 80px 80px;
    }

    .origin {
      position: absolute;
      left: 0;
      top: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #69a7ff;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 6px rgb(105 167 255 / 16%);
      pointer-events: none;
    }

    .placeholder {
      position: absolute;
      left: 120px;
      top: 100px;
      width: 420px;
      min-height: 220px;
      padding: 24px;
      border: 1px solid rgb(255 255 255 / 10%);
      border-radius: 24px;
      background: linear-gradient(145deg, rgb(255 255 255 / 8%), rgb(255 255 255 / 3%));
      box-shadow: 0 24px 70px rgb(0 0 0 / 22%);
      pointer-events: none;
    }

    .placeholder strong { display: block; margin-bottom: 8px; font-size: 24px; }
    .placeholder span { opacity: .64; line-height: 1.55; }

    .marquee {
      position: absolute;
      z-index: 3;
      pointer-events: none;
      border: 1px solid #69a7ff;
      background: rgb(105 167 255 / 14%);
      box-shadow: 0 0 0 1px rgb(105 167 255 / 14%) inset;
    }

    ::slotted([data-frakon-id]) {
      box-sizing: border-box;
      outline-offset: 3px;
    }

    ::slotted([data-frakon-selected='true']) {
      outline: 2px solid #69a7ff;
    }
  `;

  protected willUpdate(): void {
    this.viewport = normalizeViewport(this.viewport);
  }

  public selectItemById(itemId: string): void {
    if (!itemId || !this.selectableElements().some((element) => element.dataset.frakonId === itemId)) return;
    this.emitSelection(selectOnly(itemId));
  }

  private localPoint(event: PointerEvent | WheelEvent): Point {
    const rect = this.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private selectableIdFromEvent(event: Event): string | undefined {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      const id = node.dataset.frakonId;
      if (id) return id;
      if (node === this) break;
    }
    return undefined;
  }

  private emitViewport(viewport: ViewportTransform): void {
    this.viewport = normalizeViewport(viewport);
    this.dispatchEvent(new CustomEvent<FrakonStudioViewportChangedDetail>('frakon-studio-viewport-changed', {
      detail: { viewport: { ...this.viewport } },
      bubbles: true,
      composed: true,
    }));
  }

  private emitSelection(selection: SelectionState): void {
    this.selection = { ids: [...selection.ids], anchorId: selection.anchorId };
    this.syncSelectedAttributes();
    this.dispatchEvent(new CustomEvent<FrakonStudioSelectionChangedDetail>('frakon-studio-selection-changed', {
      detail: { selection: { ids: [...this.selection.ids], anchorId: this.selection.anchorId } },
      bubbles: true,
      composed: true,
    }));
  }

  private syncSelectedAttributes(): void {
    const selected = new Set(this.selection.ids);
    for (const element of this.selectableElements()) {
      element.dataset.frakonSelected = String(selected.has(element.dataset.frakonId ?? ''));
    }
  }

  private selectableElements(): HTMLElement[] {
    const slot = this.renderRoot.querySelector('slot');
    return (slot?.assignedElements({ flatten: true }) ?? [])
      .flatMap((element) => [element, ...element.querySelectorAll<HTMLElement>('[data-frakon-id]')])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && Boolean(element.dataset.frakonId));
  }

  private selectableItems(): SelectableItem[] {
    const hostRect = this.getBoundingClientRect();
    return this.selectableElements().map((element) => {
      const rect = element.getBoundingClientRect();
      const topLeft = screenToCanvas({ x: rect.left - hostRect.left, y: rect.top - hostRect.top }, this.viewport);
      const bottomRight = screenToCanvas({ x: rect.right - hostRect.left, y: rect.bottom - hostRect.top }, this.viewport);
      return {
        id: element.dataset.frakonId ?? '',
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
        selectable: element.dataset.frakonSelectable !== 'false',
      };
    });
  }

  private zoomBy(factor: number, anchor?: Point): void {
    const rect = this.getBoundingClientRect();
    const point = anchor ?? { x: rect.width / 2, y: rect.height / 2 };
    this.emitViewport(zoomViewportAt(this.viewport, point, this.viewport.zoom * factor));
  }

  private onWheel(event: WheelEvent): void {
    if (!this.interactive) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    this.emitViewport(zoomViewportAt(this.viewport, this.localPoint(event), this.viewport.zoom * factor));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.interactive) return;
    const target = event.composedPath()[0];
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;

    if (event.key === 'Escape') {
      if (this.selection.ids.length === 0) return;
      event.preventDefault();
      this.emitSelection(clearSelection());
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const ids = this.selectableItems().filter((item) => item.selectable !== false).map((item) => item.id);
      this.emitSelection(replaceSelection(ids, ids.at(-1)));
    }
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.interactive) return;
    (event.currentTarget as HTMLElement).closest('.studio')?.dispatchEvent(new Event('focus-requested'));
    const studio = this.renderRoot.querySelector<HTMLElement>('.studio');
    studio?.focus({ preventScroll: true });
    const selectableId = this.selectableIdFromEvent(event);
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;

    if (selectableId && event.button === 0) {
      this.emitSelection(event.ctrlKey || event.metaKey
        ? toggleSelection(this.selection, selectableId)
        : event.shiftKey
          ? addToSelection(this.selection, selectableId)
          : selectOnly(selectableId));
      return;
    }

    const panGesture = event.button === 1 || (event.button === 0 && event.altKey);
    if (!panGesture && event.button !== 0) return;

    const point = this.localPoint(event);
    this.gesture = {
      mode: panGesture ? 'pan' : 'marquee',
      pointerId: event.pointerId,
      startScreen: point,
      currentScreen: point,
      additive,
    };
    if (!panGesture && !additive) this.emitSelection(clearSelection());
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    const next = this.localPoint(event);
    if (this.gesture.mode === 'pan') {
      this.emitViewport(panViewport(this.viewport, {
        x: next.x - this.gesture.currentScreen.x,
        y: next.y - this.gesture.currentScreen.y,
      }));
    }
    this.gesture = { ...this.gesture, currentScreen: next };
  }

  private stopGesture(event: PointerEvent): void {
    if (!this.gesture || this.gesture.pointerId !== event.pointerId) return;
    const gesture = this.gesture;
    this.gesture = undefined;
    if (gesture.mode !== 'marquee') return;

    const start = screenToCanvas(gesture.startScreen, this.viewport);
    const end = screenToCanvas(gesture.currentScreen, this.viewport);
    const marquee: SelectionRect = {
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
    };
    const moved = Math.abs(gesture.currentScreen.x - gesture.startScreen.x) > 3
      || Math.abs(gesture.currentScreen.y - gesture.startScreen.y) > 3;
    if (!moved) return;
    this.emitSelection(selectByMarquee(this.selectableItems(), marquee, {
      additive: gesture.additive,
      current: this.selection,
    }));
  }

  private marqueeStyle(): string | undefined {
    if (this.gesture?.mode !== 'marquee') return undefined;
    const { startScreen, currentScreen } = this.gesture;
    const left = Math.min(startScreen.x, currentScreen.x);
    const top = Math.min(startScreen.y, currentScreen.y);
    return `left:${left}px;top:${top}px;width:${Math.abs(currentScreen.x - startScreen.x)}px;height:${Math.abs(currentScreen.y - startScreen.y)}px`;
  }

  render() {
    const zoomPercent = Math.round(this.viewport.zoom * 100);
    const transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;
    const modeClass = this.gesture?.mode === 'pan' ? 'panning' : this.gesture?.mode === 'marquee' ? 'marquee-selecting' : '';

    return html`
      <section class="studio" tabindex="0" @keydown=${this.onKeyDown}>
        <div class="toolbar" aria-label="Canvas zoom controls">
          <button @click=${() => this.zoomBy(0.8)} ?disabled=${this.viewport.zoom <= MIN_VIEWPORT_ZOOM}>−</button>
          <output>${zoomPercent}%</output>
          <button @click=${() => this.zoomBy(1.25)} ?disabled=${this.viewport.zoom >= MAX_VIEWPORT_ZOOM}>+</button>
          <button @click=${() => this.emitViewport(resetViewport())}>100%</button>
          <output>${this.selection.ids.length} selected</output>
        </div>
        <div
          class="viewport ${modeClass}"
          @wheel=${this.onWheel}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.stopGesture}
          @pointercancel=${this.stopGesture}
        >
          <div class="world" style=${`transform:${transform}`}>
            <div class="origin" title="Canvas origin"></div>
            <div class="placeholder">
              <strong>FRAKON Dashboard Studio</strong>
              <span>Click objects to select, use Shift or Ctrl/Cmd for multiple selection, drag empty canvas for a marquee and use Alt-drag or the middle mouse button to pan.</span>
            </div>
            <slot @slotchange=${this.syncSelectedAttributes}></slot>
          </div>
          ${this.marqueeStyle() ? html`<div class="marquee" style=${this.marqueeStyle()}></div>` : nothing}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-studio-canvas': FrakonStudioCanvas;
  }
}
