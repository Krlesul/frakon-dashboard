import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Guideline } from '../../../packages/studio-engine/src/guidelines';

@customElement('frakon-guideline-overlay')
export class FrakonGuidelineOverlay extends LitElement {
  @property({ attribute: false }) guidelines: Guideline[] = [];
  @property({ type: Number }) width = 4000;
  @property({ type: Number }) height = 4000;

  static styles = css`
    :host {
      position:absolute;
      inset:0;
      display:block;
      pointer-events:none;
      z-index:30;
      overflow:visible;
    }
    .guide {
      position:absolute;
      pointer-events:none;
      background:#69a7ff;
      box-shadow:0 0 0 1px rgb(105 167 255 / 12%);
    }
    .guide.x { top:0; width:1px; }
    .guide.y { left:0; height:1px; }
    .guide.spacing {
      background:#b985ff;
      box-shadow:0 0 0 1px rgb(185 133 255 / 14%);
    }
    .label {
      position:absolute;
      transform:translate(6px,6px);
      padding:3px 6px;
      border:1px solid rgb(185 133 255 / 42%);
      border-radius:6px;
      color:#f7efff;
      background:rgb(72 41 104 / 92%);
      font:600 11px/1.2 Inter,system-ui,sans-serif;
      white-space:nowrap;
    }
  `;

  private renderGuide(guide: Guideline) {
    if (!Number.isFinite(guide.position)) return nothing;
    const spacingClass = guide.kind === 'spacing' ? ' spacing' : '';
    if (guide.axis === 'x') {
      return html`
        <span class=${`guide x${spacingClass}`} style=${`left:${guide.position}px;height:${this.height}px`}></span>
        ${guide.kind === 'spacing' && guide.distance !== undefined
          ? html`<span class="label" style=${`left:${guide.position}px;top:8px`}>${Math.round(guide.distance)} px</span>`
          : nothing}
      `;
    }
    return html`
      <span class=${`guide y${spacingClass}`} style=${`top:${guide.position}px;width:${this.width}px`}></span>
      ${guide.kind === 'spacing' && guide.distance !== undefined
        ? html`<span class="label" style=${`left:8px;top:${guide.position}px`}>${Math.round(guide.distance)} px</span>`
        : nothing}
    `;
  }

  render() {
    return html`${this.guidelines.map((guide) => this.renderGuide(guide))}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-guideline-overlay': FrakonGuidelineOverlay;
  }
}
