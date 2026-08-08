import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FrakonBreakpoint } from './layout-model';

export interface FrakonCanvasV2BreakpointSelectDetail {
  breakpoint: FrakonBreakpoint;
}

const LABELS: Record<FrakonBreakpoint, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
  wide: 'Wide',
};

@customElement('frakon-canvas-v2-breakpoint-toolbar')
export class FrakonCanvasV2BreakpointToolbar extends LitElement {
  @property({ attribute: false }) active: FrakonBreakpoint = 'desktop';
  @property({ attribute: false }) available: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

  static styles = css`
    :host { display: block; }
    .toolbar { display: inline-flex; gap: 4px; padding: 5px; border-radius: 11px; background: color-mix(in srgb, var(--card-background-color) 90%, var(--primary-text-color) 10%); }
    button { border: 0; border-radius: 8px; padding: 6px 9px; color: inherit; background: transparent; cursor: pointer; font: inherit; font-size: 11px; }
    button.active { background: color-mix(in srgb, var(--primary-color) 22%, transparent); font-weight: 700; }
    button.missing { opacity: .58; }
  `;

  private select(breakpoint: FrakonBreakpoint): void {
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2BreakpointSelectDetail>('frakon-canvas-v2-breakpoint-select', {
      detail: { breakpoint },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const available = new Set(this.available);
    return html`<div class="toolbar" aria-label="Responsive canvas breakpoint">
      ${(['mobile', 'tablet', 'desktop', 'wide'] as FrakonBreakpoint[]).map((breakpoint) => html`
        <button
          class="${breakpoint === this.active ? 'active' : ''} ${available.has(breakpoint) ? '' : 'missing'}"
          aria-pressed=${breakpoint === this.active ? 'true' : 'false'}
          title=${available.has(breakpoint) ? LABELS[breakpoint] : `${LABELS[breakpoint]} · derive on first use`}
          @click=${() => this.select(breakpoint)}
        >${LABELS[breakpoint]}</button>
      `)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-breakpoint-toolbar': FrakonCanvasV2BreakpointToolbar;
  }
}
