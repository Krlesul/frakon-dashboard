import { LitElement, css, nothing, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dashboardCanvasV2ConstraintOverlay } from './dashboard-canvas-v2-constraint-overlay';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface FrakonCanvasV2ConstraintSelectDetail {
  constraintId: string;
}

@customElement('frakon-canvas-v2-constraint-overlay')
export class FrakonCanvasV2ConstraintOverlay extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) selectedConstraintId?: string;

  static styles = css`
    :host { position: absolute; z-index: 18; inset: 0; pointer-events: none; }
    svg { width: 100%; height: 100%; overflow: visible; }
    .hit { stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: pointer; }
    .line { stroke: var(--primary-color); stroke-width: 1.5; opacity: .58; vector-effect: non-scaling-stroke; pointer-events: none; }
    .line.disabled { stroke-dasharray: 5 5; opacity: .28; }
    .line.selected { stroke-width: 3; opacity: .95; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--primary-color) 70%, transparent)); }
    .label { fill: var(--primary-text-color); font-size: 10px; paint-order: stroke; stroke: var(--card-background-color); stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
    .label.selected { font-weight: 700; }
  `;

  private select(constraintId: string): void {
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2ConstraintSelectDetail>('frakon-canvas-v2-constraint-select', {
      detail: { constraintId },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const document = this.document;
    if (!document) return nothing;
    const lines = dashboardCanvasV2ConstraintOverlay(document, this.selectedIds);
    if (!lines.length) return nothing;
    const height = Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height), 1);
    return svg`
      <svg viewBox=${`0 0 ${document.layout.width} ${height}`} preserveAspectRatio="none" aria-label="Canvas constraints">
        ${lines.map((line) => {
          const selected = line.constraintId === this.selectedConstraintId;
          return svg`<g>
            <line class="hit" x1=${line.x1} y1=${line.y1} x2=${line.x2} y2=${line.y2} @click=${() => this.select(line.constraintId)}></line>
            <line class="line ${line.enabled ? '' : 'disabled'} ${selected ? 'selected' : ''}" x1=${line.x1} y1=${line.y1} x2=${line.x2} y2=${line.y2}></line>
            <text class="label ${selected ? 'selected' : ''}" x=${line.labelX} y=${line.labelY - 5} text-anchor="middle">${line.label}</text>
          </g>`;
        })}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-constraint-overlay': FrakonCanvasV2ConstraintOverlay;
  }
}
