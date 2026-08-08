import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import type { SupportedLanguage } from '../i18n';
import { canvasDashboardTranslate } from './canvas-dashboard-i18n';
import './canvas-v2-constraint-editor';
import './canvas-v2-selection-toolbar';
import { summarizeDashboardCanvasV2ConstraintDiagnostics } from './dashboard-canvas-v2-constraint-diagnostics';
import type { DashboardCanvasV2InspectorItemPatch } from './dashboard-canvas-v2-inspector-actions';
import { dashboardCanvasV2InspectorSelection } from './dashboard-canvas-v2-inspector';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export type FrakonCanvasV2InspectorEditDetail =
  | { kind: 'item'; itemId: string; patch: DashboardCanvasV2InspectorItemPatch }
  | { kind: 'snap'; patch: { enabled?: boolean; size?: number } };

@customElement('frakon-canvas-v2-inspector-panel')
export class FrakonCanvasV2InspectorPanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) diagnostics: ConstraintDiagnostic[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  static styles = css`
    :host { display: block; margin-top: 10px; }
    .panel { display: grid; gap: 9px; padding: 11px 12px; border-radius: 14px; background: color-mix(in srgb, var(--card-background-color) 90%, var(--primary-color) 10%); border: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 700; }
    .summary { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .chip { padding: 4px 7px; border-radius: 999px; font-size: 11px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .chip.warning { background: color-mix(in srgb, #f0a85a 20%, transparent); }
    .chip.error { background: color-mix(in srgb, #ff4d67 18%, transparent); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .field { display: grid; gap: 3px; padding: 6px 7px; border-radius: 9px; background: color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); min-width: 0; }
    .label { font-size: 10px; opacity: .65; }
    input[type='number'] { width: 100%; min-width: 0; box-sizing: border-box; border: 0; border-radius: 6px; padding: 5px 6px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font: inherit; }
    .toggle { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
    .issues { display: grid; gap: 5px; }
    .issue { font-size: 11px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, #f0a85a 12%, transparent); }
    @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string { return canvasDashboardTranslate(this.language, key); }
  private dispatchEdit(detail: FrakonCanvasV2InspectorEditDetail): void { this.dispatchEvent(new CustomEvent<FrakonCanvasV2InspectorEditDetail>('frakon-canvas-v2-inspector-edit', { detail, bubbles: true, composed: true })); }
  private numberValue(event: Event): number | undefined { const value = Number((event.currentTarget as HTMLInputElement).value); return Number.isFinite(value) ? value : undefined; }
  private optionalNumberValue(event: Event): number | null | undefined { const raw = (event.currentTarget as HTMLInputElement).value.trim(); if (!raw) return null; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
  private itemField(itemId: string, key: 'x' | 'y' | 'width' | 'height', value: number, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" .value=${String(Math.round(value))} @change=${(event: Event) => { const next = this.numberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }
  private optionalItemField(itemId: string, key: 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight', value: number | undefined, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" min="1" .value=${value === undefined ? '' : String(Math.round(value))} @change=${(event: Event) => { const next = this.optionalNumberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }

  render() {
    if (!this.document) return nothing;
    const selection = dashboardCanvasV2InspectorSelection(this.document, this.selectedIds);
    const diagnostics = summarizeDashboardCanvasV2ConstraintDiagnostics(this.diagnostics);
    const single = selection.single;
    const diagnosticClass = diagnostics.severity === 'error' ? 'error' : diagnostics.severity === 'warning' ? 'warning' : '';
    return html`<section class="panel">
      <div class="title"><span>${this.t('inspector')}</span><span>${selection.count} ${this.t('selected')}</span></div>
      <div class="summary">
        <label class="toggle"><input type="checkbox" .checked=${selection.snapEnabled} @change=${(event: Event) => this.dispatchEdit({ kind: 'snap', patch: { enabled: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('snap')}</label>
        <label class="toggle">px <input type="number" min="1" style="width:68px" .value=${String(selection.snapSize)} @change=${(event: Event) => { const size = this.numberValue(event); if (size !== undefined) this.dispatchEdit({ kind: 'snap', patch: { size } }); }}></label>
        <span class="chip">${this.t('locked')}: ${selection.lockedCount}</span><span class="chip">${this.t('constraints')}: ${selection.constraintCount}</span><span class="chip ${diagnosticClass}">${this.t('diagnostics')}: ${diagnostics.applied}/${diagnostics.total}</span>
      </div>
      ${single ? html`<div class="grid">${this.itemField(single.id,'x',single.frame.x,'X')}${this.itemField(single.id,'y',single.frame.y,'Y')}${this.itemField(single.id,'width',single.frame.width,'W')}${this.itemField(single.id,'height',single.frame.height,'H')}${this.optionalItemField(single.id,'minWidth',single.minWidth,'min W')}${this.optionalItemField(single.id,'minHeight',single.minHeight,'min H')}${this.optionalItemField(single.id,'maxWidth',single.maxWidth,'max W')}${this.optionalItemField(single.id,'maxHeight',single.maxHeight,'max H')}</div><label class="toggle"><input type="checkbox" .checked=${single.locked === true} @change=${(event: Event) => this.dispatchEdit({ kind: 'item', itemId: single.id, patch: { locked: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('locked')}</label>` : nothing}
      <frakon-canvas-v2-selection-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-selection-toolbar>
      <frakon-canvas-v2-constraint-editor .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-constraint-editor>
      ${diagnostics.issues.length ? html`<div class="issues">${diagnostics.issues.map((issue) => html`<div class="issue">${issue.constraintId} · ${issue.status} · ${issue.message}</div>`)}</div>` : nothing}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-inspector-panel': FrakonCanvasV2InspectorPanel; } }
