import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import { applyDashboardCanvasV2ItemAction, type DashboardCanvasV2ItemAction } from './dashboard-canvas-v2-item-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const LABELS: Record<SupportedLanguage, Record<DashboardCanvasV2ItemAction, string>> = {
  en: { duplicate: 'Duplicate', delete: 'Delete' },
  cs: { duplicate: 'Duplikovat', delete: 'Smazat' },
  de: { duplicate: 'Duplizieren', delete: 'Löschen' },
  sk: { duplicate: 'Duplikovať', delete: 'Vymazať' },
  pl: { duplicate: 'Duplikuj', delete: 'Usuń' },
};

@customElement('frakon-canvas-v2-item-toolbar')
export class FrakonCanvasV2ItemToolbar extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private localError?: string;

  static styles = css`
    :host { display: block; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 5px; padding-top: 4px; border-top: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    button { border: 0; border-radius: 8px; padding: 6px 10px; color: inherit; background: color-mix(in srgb, var(--primary-color) 14%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    button.danger { background: color-mix(in srgb, #ff4d67 15%, transparent); }
    .error { flex-basis: 100%; padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 16%, transparent); }
  `;

  private apply(action: DashboardCanvasV2ItemAction): void {
    if (!this.document) return;
    const result = applyDashboardCanvasV2ItemAction(this.document, this.selectedIds, action);
    if (result.status === 'invalid') { this.localError = result.reason; return; }
    this.localError = undefined;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-selection-set', {
      detail: { selectedIds: result.selectedIds },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document || !this.selectedIds.length) return nothing;
    const hasUnlocked = this.document.items.some((item) => this.selectedIds.includes(item.id) && !item.locked);
    if (!hasUnlocked) return nothing;
    return html`<div class="toolbar">
      <button @click=${() => this.apply('duplicate')}>⧉ ${LABELS[this.language].duplicate}</button>
      <button class="danger" @click=${() => this.apply('delete')}>⌫ ${LABELS[this.language].delete}</button>
      ${this.localError ? html`<div class="error">${this.localError}</div>` : nothing}
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-item-toolbar': FrakonCanvasV2ItemToolbar; } }
