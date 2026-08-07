import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import { applyDashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const ACTIONS: Array<{ action: DashboardCanvasV2SelectionAction; label: string; title: string }> = [
  { action: 'align-left', label: '⇤', title: 'Align left' },
  { action: 'align-center-x', label: '↔', title: 'Align horizontal center' },
  { action: 'align-right', label: '⇥', title: 'Align right' },
  { action: 'align-top', label: '⇧', title: 'Align top' },
  { action: 'align-center-y', label: '↕', title: 'Align vertical center' },
  { action: 'align-bottom', label: '⇩', title: 'Align bottom' },
  { action: 'match-width', label: 'W=', title: 'Match width' },
  { action: 'match-height', label: 'H=', title: 'Match height' },
];

@customElement('frakon-canvas-v2-selection-toolbar')
export class FrakonCanvasV2SelectionToolbar extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @state() private localError?: string;

  static styles = css`
    :host { display: block; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 5px; padding-top: 4px; border-top: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    button { min-width: 34px; border: 0; border-radius: 8px; padding: 6px 8px; color: inherit; background: color-mix(in srgb, var(--primary-color) 14%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    .error { flex-basis: 100%; padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 16%, transparent); }
  `;

  private apply(action: DashboardCanvasV2SelectionAction): void {
    if (!this.document) return;
    const result = applyDashboardCanvasV2SelectionAction(this.document, this.selectedIds, action);
    if (result.status === 'invalid') {
      this.localError = result.reason ?? 'Invalid selection action.';
      return;
    }
    this.localError = result.status === 'collision'
      ? `Alignment blocked by collision: ${result.collisionIds.join(', ')}.`
      : undefined;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: {
        status: result.status,
        document: result.document,
        collisionIds: result.collisionIds,
        constraintDiagnostics: result.constraintDiagnostics,
      },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document || this.selectedIds.length < 2) return nothing;
    return html`
      <div class="toolbar">
        ${ACTIONS.map(({ action, label, title }) => html`<button title=${title} aria-label=${title} @click=${() => this.apply(action)}>${label}</button>`)}
        ${this.localError ? html`<div class="error">${this.localError}</div>` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-selection-toolbar': FrakonCanvasV2SelectionToolbar;
  }
}
