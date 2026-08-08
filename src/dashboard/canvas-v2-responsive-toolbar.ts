import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import './canvas-v2-breakpoint-toolbar';
import type { FrakonBreakpoint } from './layout-model';
import { canvasV2ResponsiveToolbarTranslate } from './canvas-v2-responsive-toolbar-i18n';

export interface FrakonCanvasV2ModeSelectDetail {
  mode: 'auto' | 'manual';
}

export interface FrakonCanvasV2CopyLayoutDetail {
  source: FrakonBreakpoint;
}

@customElement('frakon-canvas-v2-responsive-toolbar')
export class FrakonCanvasV2ResponsiveToolbar extends LitElement {
  @property({ attribute: false }) active: FrakonBreakpoint = 'desktop';
  @property({ attribute: false }) available: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
  @property({ attribute: false }) mode: 'auto' | 'manual' = 'manual';
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  static styles = css`
    :host { display:block; }
    .wrap { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .mode { display:inline-flex; gap:4px; padding:4px; border-radius:10px; background:color-mix(in srgb,var(--card-background-color) 90%,var(--primary-text-color) 10%); }
    button,select { border:0; border-radius:8px; padding:6px 9px; color:inherit; background:color-mix(in srgb,var(--primary-color) 12%,transparent); font:inherit; font-size:11px; }
    button { cursor:pointer; }
    button.active { background:color-mix(in srgb,var(--primary-color) 24%,transparent); font-weight:700; }
    button:disabled,select:disabled { opacity:.42; cursor:default; }
    .copy { display:inline-flex; gap:5px; align-items:center; }
    .label { font-size:11px; opacity:.68; }
  `;

  private t(key: Parameters<typeof canvasV2ResponsiveToolbarTranslate>[1]): string {
    return canvasV2ResponsiveToolbarTranslate(this.language, key);
  }

  private selectMode(mode: 'auto' | 'manual'): void {
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2ModeSelectDetail>('frakon-canvas-v2-mode-select', {
      detail: { mode }, bubbles: true, composed: true,
    }));
  }

  private copy(event: Event): void {
    const source = (event.currentTarget as HTMLButtonElement).dataset.source as FrakonBreakpoint | undefined;
    if (!source) return;
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2CopyLayoutDetail>('frakon-canvas-v2-copy-layout', {
      detail: { source }, bubbles: true, composed: true,
    }));
  }

  private reset(): void {
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-reset-layout', { bubbles: true, composed: true }));
  }

  render() {
    const sources = this.available.filter((breakpoint) => breakpoint !== this.active);
    const copySource = sources[0];
    return html`<div class="wrap" aria-label=${this.t('responsiveLayout')}>
      <div class="mode">
        <button class=${this.mode === 'auto' ? 'active' : ''} aria-pressed=${this.mode === 'auto'} @click=${() => this.selectMode('auto')}>${this.t('auto')}</button>
        <button class=${this.mode === 'manual' ? 'active' : ''} aria-pressed=${this.mode === 'manual'} @click=${() => this.selectMode('manual')}>${this.t('manual')}</button>
      </div>
      <frakon-canvas-v2-breakpoint-toolbar .active=${this.active} .available=${this.available}></frakon-canvas-v2-breakpoint-toolbar>
      ${copySource ? html`<div class="copy">
        <span class="label">${this.t('copyFrom')}</span>
        ${sources.map((source) => html`<button data-source=${source} @click=${this.copy}>${source}</button>`)}
      </div>` : nothing}
      <button title=${this.t('resetTitle')} @click=${this.reset}>${this.t('reset')}</button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-responsive-toolbar': FrakonCanvasV2ResponsiveToolbar;
  }
}
