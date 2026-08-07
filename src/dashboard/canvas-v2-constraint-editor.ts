import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ConstraintKind } from '../../packages/studio-engine/src/constraints';
import type { SupportedLanguage } from '../i18n';
import { canvasDashboardTranslate } from './canvas-dashboard-i18n';
import {
  addDashboardCanvasV2Constraint,
  patchDashboardCanvasV2Constraint,
  removeDashboardCanvasV2Constraint,
  type DashboardCanvasV2ConstraintEditResult,
} from './dashboard-canvas-v2-constraint-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const KINDS: ConstraintKind[] = [
  'below', 'right-of',
  'align-left', 'align-center-x', 'align-right',
  'align-top', 'align-center-y', 'align-bottom',
  'match-width', 'match-height',
];

@customElement('frakon-canvas-v2-constraint-editor')
export class FrakonCanvasV2ConstraintEditor extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private localError?: string;

  static styles = css`
    :host { display: block; }
    .section { display: grid; gap: 7px; padding-top: 4px; border-top: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    .title { font-size: 11px; font-weight: 700; }
    .row { display: grid; grid-template-columns: minmax(90px, 1.1fr) minmax(90px, 1.1fr) 76px 72px auto auto; gap: 6px; align-items: center; }
    select, input[type='number'] { min-width: 0; width: 100%; box-sizing: border-box; border: 0; border-radius: 7px; padding: 6px 7px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font: inherit; font-size: 11px; }
    button { border: 0; border-radius: 8px; padding: 6px 8px; color: inherit; background: color-mix(in srgb, var(--primary-color) 14%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    button.danger { background: color-mix(in srgb, #ff4d67 15%, transparent); }
    .enabled { display: inline-flex; gap: 4px; align-items: center; font-size: 10px; white-space: nowrap; }
    .error { padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 16%, transparent); }
    @media (max-width: 760px) { .row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string {
    return canvasDashboardTranslate(this.language, key);
  }

  private applyResult(result: DashboardCanvasV2ConstraintEditResult): void {
    if (result.status === 'invalid') {
      this.localError = result.reason ?? 'Invalid constraint.';
      return;
    }
    if (result.status === 'collision') {
      this.localError = `Constraint edit blocked by collision: ${result.collisionIds.join(', ')}.`;
    } else {
      this.localError = undefined;
    }
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

  private add(sourceId: string, targetId: string): void {
    if (!this.document) return;
    this.applyResult(addDashboardCanvasV2Constraint(this.document, {
      kind: 'below', sourceId, targetId, gap: 12, enabled: true,
    }));
  }

  private patch(constraintId: string, patch: Parameters<typeof patchDashboardCanvasV2Constraint>[2]): void {
    if (!this.document) return;
    this.applyResult(patchDashboardCanvasV2Constraint(this.document, constraintId, patch));
  }

  private remove(constraintId: string): void {
    if (!this.document) return;
    this.applyResult(removeDashboardCanvasV2Constraint(this.document, constraintId));
  }

  private relatedConstraints(sourceId: string) {
    return (this.document?.constraints ?? []).filter((constraint) => constraint.sourceId === sourceId);
  }

  render() {
    const document = this.document;
    if (!document || this.selectedIds.length !== 1) return nothing;
    const sourceId = this.selectedIds[0];
    const targets = document.items.filter((item) => item.id !== sourceId);
    if (!targets.length) return nothing;
    const constraints = this.relatedConstraints(sourceId);
    const defaultTarget = targets[0]?.id;

    return html`
      <section class="section">
        <div class="title">${this.t('constraintEditor')} · ${sourceId}</div>
        ${constraints.map((constraint) => html`
          <div class="row">
            <select title=${this.t('constraintKind')} .value=${constraint.kind} @change=${(event: Event) => this.patch(constraint.id, { kind: (event.currentTarget as HTMLSelectElement).value as ConstraintKind })}>
              ${KINDS.map((kind) => html`<option value=${kind}>${kind}</option>`)}
            </select>
            <select title=${this.t('constraintTarget')} .value=${constraint.targetId} @change=${(event: Event) => this.patch(constraint.id, { targetId: (event.currentTarget as HTMLSelectElement).value })}>
              ${targets.map((target) => html`<option value=${target.id}>${target.id}</option>`)}
            </select>
            <input title=${this.t('constraintGap')} type="number" .value=${constraint.gap === undefined ? '' : String(constraint.gap)} @change=${(event: Event) => {
              const raw = (event.currentTarget as HTMLInputElement).value.trim();
              this.patch(constraint.id, { gap: raw ? Number(raw) : null });
            }}>
            <input title=${this.t('constraintPriority')} type="number" .value=${constraint.priority === undefined ? '' : String(constraint.priority)} @change=${(event: Event) => {
              const raw = (event.currentTarget as HTMLInputElement).value.trim();
              this.patch(constraint.id, { priority: raw ? Number(raw) : null });
            }}>
            <label class="enabled"><input type="checkbox" .checked=${constraint.enabled !== false} @change=${(event: Event) => this.patch(constraint.id, { enabled: (event.currentTarget as HTMLInputElement).checked })}>${this.t('enabled')}</label>
            <button class="danger" @click=${() => this.remove(constraint.id)}>${this.t('removeConstraint')}</button>
          </div>
        `)}
        ${defaultTarget ? html`<button @click=${() => this.add(sourceId, defaultTarget)}>+ ${this.t('addConstraint')}</button>` : nothing}
        ${this.localError ? html`<div class="error">${this.localError}</div>` : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-constraint-editor': FrakonCanvasV2ConstraintEditor;
  }
}
