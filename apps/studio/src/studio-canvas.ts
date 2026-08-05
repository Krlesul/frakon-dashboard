import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DEFAULT_VIEWPORT,
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  normalizeViewport,
  panViewport,
  resetViewport,
  zoomViewportAt,
  type Point,
  type ViewportTransform,
} from '../../../packages/studio-engine/src/viewport';

export interface FrakonStudioViewportChangedDetail {
  viewport: ViewportTransform;
}

@customElement('frakon-studio-canvas')
export class FrakonStudioCanvas extends LitElement {
  @property({ attribute: false }) viewport: ViewportTransform = { ...DEFAULT_VIEWPORT };
  @property({ type: Boolean }) interactive = true;
  @state() private panning = false;

  private pointerId?: number;
  private lastPointer?: Point;

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
    }

    .toolbar {
      position: absolute;
      z-index: 3;
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
      cursor: grab;
    }

    .viewport.panning { cursor: grabbing; }

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
    }

    .placeholder strong { display: block; margin-bottom: 8px; font-size: 24px; }
    .placeholder span { opacity: .64; line-height: 1.55; }
  `;

  protected willUpdate(): void {
    this.viewport = normalizeViewport(this.viewport);
  }

  private emitViewport(viewport: ViewportTransform): void {
    this.viewport = normalizeViewport(viewport);
    this.dispatchEvent(new CustomEvent<FrakonStudioViewportChangedDetail>('frakon-studio-viewport-changed', {
      detail: { viewport: { ...this.viewport } },
      bubbles: true,
      composed: true,
    }));
  }

  private zoomBy(factor: number, anchor?: Point): void {
    const rect = this.getBoundingClientRect();
    const point = anchor ?? { x: rect.width / 2, y: rect.height / 2 };
    this.emitViewport(zoomViewportAt(this.viewport, point, this.viewport.zoom * factor));
  }

  private onWheel(event: WheelEvent): void {
    if (!this.interactive) return;
    event.preventDefault();
    const rect = this.getBoundingClientRect();
    const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const factor = Math.exp(-event.deltaY * 0.0015);
    this.emitViewport(zoomViewportAt(this.viewport, anchor, this.viewport.zoom * factor));
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.interactive || event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.panning = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.panning || this.pointerId !== event.pointerId || !this.lastPointer) return;
    const next = { x: event.clientX, y: event.clientY };
    this.emitViewport(panViewport(this.viewport, {
      x: next.x - this.lastPointer.x,
      y: next.y - this.lastPointer.y,
    }));
    this.lastPointer = next;
  }

  private stopPanning(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = undefined;
    this.lastPointer = undefined;
    this.panning = false;
  }

  render() {
    const zoomPercent = Math.round(this.viewport.zoom * 100);
    const transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;

    return html`
      <section class="studio">
        <div class="toolbar" aria-label="Canvas zoom controls">
          <button @click=${() => this.zoomBy(0.8)} ?disabled=${this.viewport.zoom <= MIN_VIEWPORT_ZOOM}>−</button>
          <output>${zoomPercent}%</output>
          <button @click=${() => this.zoomBy(1.25)} ?disabled=${this.viewport.zoom >= MAX_VIEWPORT_ZOOM}>+</button>
          <button @click=${() => this.emitViewport(resetViewport())}>100%</button>
        </div>
        <div
          class="viewport ${this.panning ? 'panning' : ''}"
          @wheel=${this.onWheel}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.stopPanning}
          @pointercancel=${this.stopPanning}
        >
          <div class="world" style=${`transform:${transform}`}>
            <div class="origin" title="Canvas origin"></div>
            <div class="placeholder">
              <strong>FRAKON Dashboard Studio</strong>
              <span>Infinite canvas foundation with cursor-centered zoom, pointer panning and a reusable platform-neutral viewport model.</span>
            </div>
            <slot></slot>
          </div>
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
