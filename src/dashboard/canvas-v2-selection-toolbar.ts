import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import { canvasDashboardTranslate, type CanvasDashboardTranslationKey } from './canvas-dashboard-i18n';
import type { DashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import { applyDashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const ACTIONS: Array<{ action: DashboardCanvasV2SelectionAction; label: string; title: CanvasDashboardTranslationKey; minimum: number }> = [
  { action: 'align-left', label: '⇤', title: 'alignLeft', minimum: 2 },
  { action: 'align-center-x', label: '↔', title: 'alignCenterX', minimum: 2 },
  { action: 'align-right', label: '⇥', title: 'alignRight', minimum: 2 },
  { action: 'align-top', label: '⇧', title: 'alignTop', minimum: 2 },
  { action: 'align-center-y', label: '↕', title: 'alignCenterY', minimum: 2 },
  { action: 'align-bottom', label: '⇩', title: 'alignBottom', minimum: 2 },
  { action: 'match-width', label: 'W=', title: 'matchWidth', minimum: 2 },
  { action: 'match-height', label: 'H=', title: 'matchHeight', minimum: 2 },
  { action: 'distribute-horizontal', label: 'H↔', title: 'distributeHorizontal', minimum: 3 },
  { action: 'distribute-vertical', label: 'V↕', title: 'distributeVertical', minimum: 3 },
  { action: 'equal-gap-horizontal', label: 'H=', title: 'equalGapHorizontal', minimum: 3 },
  { action: 'equal-gap-vertical', label: 'V=', title: 'equalGapVertical', minimum: 3 },
];

@customElement('frakon-canvas-v2-selection-toolbar')
export class FrakonCanvasV2SelectionToolbar extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private localError?: string;

  static styles = css`
    :host { display: block; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 5px; padding-top: 4px; border-top: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    button { min-width: 34px; border: 0; border-radius: 8px; padding: 6px 8px; color: inherit; background: color-mix(in srgb, var(--primary-color) 14%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    button:disabled { opacity: .35; cursor: not-allowed; }
    .error { flex-basis: 100%; padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 16%, transparent); }
  `;

  private t(key: CanvasDashboardTranslationKey): string { return canvasDashboardTranslate(this.language, key); }

  private apply(action: DashboardCanvasV2SelectionAction): void {
    if (!this.document) return;
    const result = applyDashboardCanvasV2SelectionAction(this.document, this.selectedIds, action);
    if (result.status === 'invalid') {
      this.localError = result.reason ?? this.t('selectionActionInvalid');
      return;
    }
    this.localError = result.status === 'collision'
      ? `${this.t('selectionCollision')}: ${result.collisionIds.join(', ')}.`
      : undefined;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: result.status, document: result.document, collisionIds: result.collisionIds, constraintDiagnostics: result.constraintDiagnostics },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document || this.selectedIds.length < 2) return nothing;
    const unlockedCount = this.document.items.filter((item) => this.selectedIds.includes(item.id) && !item.locked).length;
    return html`<div class="toolbar">
      ${ACTIONS.map(({ action, label, title, minimum }) => html`<button title=${this.t(title)} aria-label=${this.t(title)} ?disabled=${unlockedCount < minimum} @click=${() => this.apply(action)}>${label}</button>`)}
      ${this.localError ? html`<div class="error">${this.localError}</div>` : nothing}
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-selection-toolbar': FrakonCanvasV2SelectionToolbar; } }
