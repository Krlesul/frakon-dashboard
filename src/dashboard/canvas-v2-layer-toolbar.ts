import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import { applyDashboardCanvasV2LayerAction, type DashboardCanvasV2LayerAction } from './dashboard-canvas-v2-layer-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const LABELS: Record<SupportedLanguage, Record<DashboardCanvasV2LayerAction, string>> = {
  en: { 'bring-front':'Bring to front','send-back':'Send to back','bring-forward':'Bring forward','send-backward':'Send backward' },
  cs: { 'bring-front':'Úplně dopředu','send-back':'Úplně dozadu','bring-forward':'O vrstvu dopředu','send-backward':'O vrstvu dozadu' },
  de: { 'bring-front':'Ganz nach vorne','send-back':'Ganz nach hinten','bring-forward':'Eine Ebene nach vorne','send-backward':'Eine Ebene nach hinten' },
  sk: { 'bring-front':'Úplne dopredu','send-back':'Úplne dozadu','bring-forward':'O vrstvu dopredu','send-backward':'O vrstvu dozadu' },
  pl: { 'bring-front':'Na sam przód','send-back':'Na sam tył','bring-forward':'Warstwę do przodu','send-backward':'Warstwę do tyłu' },
};

const ACTIONS: Array<{ action: DashboardCanvasV2LayerAction; icon: string }> = [
  { action: 'bring-front', icon: '⇈' },
  { action: 'bring-forward', icon: '↑' },
  { action: 'send-backward', icon: '↓' },
  { action: 'send-back', icon: '⇊' },
];

@customElement('frakon-canvas-v2-layer-toolbar')
export class FrakonCanvasV2LayerToolbar extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private localError?: string;

  static styles = css`
    :host { display: block; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 5px; padding-top: 4px; border-top: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    button { min-width: 34px; border: 0; border-radius: 8px; padding: 6px 8px; color: inherit; background: color-mix(in srgb, var(--primary-color) 14%, transparent); cursor: pointer; font: inherit; font-size: 12px; }
    .error { flex-basis: 100%; padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 16%, transparent); }
  `;

  private apply(action: DashboardCanvasV2LayerAction): void {
    if (!this.document) return;
    const result = applyDashboardCanvasV2LayerAction(this.document, this.selectedIds, action);
    if (result.status === 'invalid') { this.localError = result.reason; return; }
    this.localError = undefined;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: result.status, document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document || !this.selectedIds.length) return nothing;
    const unlockedCount = this.document.items.filter((item) => this.selectedIds.includes(item.id) && !item.locked).length;
    if (!unlockedCount) return nothing;
    return html`<div class="toolbar">
      ${ACTIONS.map(({ action, icon }) => html`<button title=${LABELS[this.language][action]} aria-label=${LABELS[this.language][action]} @click=${() => this.apply(action)}>${icon}</button>`)}
      ${this.localError ? html`<div class="error">${this.localError}</div>` : nothing}
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-layer-toolbar': FrakonCanvasV2LayerToolbar; } }
