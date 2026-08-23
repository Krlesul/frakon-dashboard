import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';

export type FrakonCanvasV2ViewportAction =
  | { kind: 'zoom'; zoom: number }
  | { kind: 'fit' }
  | { kind: 'reset' };

const FIT: Record<SupportedLanguage, string> = { en: 'Fit', cs: 'Přizpůsobit', de: 'Einpassen', sk: 'Prispôsobiť', pl: 'Dopasuj' };
const RESET: Record<SupportedLanguage, string> = { en: '100%', cs: '100 %', de: '100 %', sk: '100 %', pl: '100 %' };

@customElement('frakon-canvas-v2-viewport-toolbar')
export class FrakonCanvasV2ViewportToolbar extends LitElement {
  @property({ type: Number }) zoom = 1;
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  static styles = css`
    :host { display: block; }
    .toolbar { display: inline-flex; align-items: center; gap: 4px; padding: 5px; border-radius: 11px; background: color-mix(in srgb, var(--card-background-color) 90%, var(--primary-text-color) 10%); }
    button { border: 0; border-radius: 8px; padding: 6px 9px; color: inherit; background: color-mix(in srgb, var(--primary-color) 13%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    .value { min-width: 52px; text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; }
  `;

  private emit(detail: FrakonCanvasV2ViewportAction): void {
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2ViewportAction>('frakon-canvas-v2-viewport-action', { detail, bubbles: true, composed: true }));
  }

  render() {
    const step = 0.1;
    return html`<div class="toolbar">
      <button aria-label="Zoom out" @click=${() => this.emit({ kind: 'zoom', zoom: this.zoom - step })}>−</button>
      <span class="value">${Math.round(this.zoom * 100)}%</span>
      <button aria-label="Zoom in" @click=${() => this.emit({ kind: 'zoom', zoom: this.zoom + step })}>+</button>
      <button @click=${() => this.emit({ kind: 'reset' })}>${RESET[this.language]}</button>
      <button @click=${() => this.emit({ kind: 'fit' })}>${FIT[this.language]}</button>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-viewport-toolbar': FrakonCanvasV2ViewportToolbar; } }
