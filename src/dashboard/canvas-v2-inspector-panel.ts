import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import type { SupportedLanguage } from '../i18n';
import { canvasDashboardTranslate } from './canvas-dashboard-i18n';
import { summarizeDashboardCanvasV2ConstraintDiagnostics } from './dashboard-canvas-v2-constraint-diagnostics';
import { dashboardCanvasV2InspectorSelection } from './dashboard-canvas-v2-inspector';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

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
    .summary { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 4px 7px; border-radius: 999px; font-size: 11px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .chip.warning { background: color-mix(in srgb, #f0a85a 20%, transparent); }
    .chip.error { background: color-mix(in srgb, #ff4d67 18%, transparent); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .metric { padding: 7px 8px; border-radius: 9px; background: color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); min-width: 0; }
    .metric b { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label { font-size: 10px; opacity: .65; }
    .issues { display: grid; gap: 5px; }
    .issue { font-size: 11px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, #f0a85a 12%, transparent); }
    @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string {
    return canvasDashboardTranslate(this.language, key);
  }

  render() {
    if (!this.document) return nothing;
    const selection = dashboardCanvasV2InspectorSelection(this.document, this.selectedIds);
    const diagnostics = summarizeDashboardCanvasV2ConstraintDiagnostics(this.diagnostics);
    const single = selection.single;
    const diagnosticClass = diagnostics.severity === 'error' ? 'error' : diagnostics.severity === 'warning' ? 'warning' : '';

    return html`
      <section class="panel">
        <div class="title">
          <span>${this.t('inspector')}</span>
          <span>${selection.count} ${this.t('selected')}</span>
        </div>
        <div class="summary">
          <span class="chip">${this.t('snap')}: ${selection.snapEnabled ? `${selection.snapSize}px` : this.t('off')}</span>
          <span class="chip">${this.t('locked')}: ${selection.lockedCount}</span>
          <span class="chip">${this.t('constraints')}: ${selection.constraintCount}</span>
          <span class="chip ${diagnosticClass}">${this.t('diagnostics')}: ${diagnostics.applied}/${diagnostics.total}</span>
        </div>
        ${single ? html`
          <div class="grid">
            <div class="metric"><span class="label">X</span><b>${Math.round(single.frame.x)} px</b></div>
            <div class="metric"><span class="label">Y</span><b>${Math.round(single.frame.y)} px</b></div>
            <div class="metric"><span class="label">W</span><b>${Math.round(single.frame.width)} px</b></div>
            <div class="metric"><span class="label">H</span><b>${Math.round(single.frame.height)} px</b></div>
            <div class="metric"><span class="label">min W</span><b>${single.minWidth ?? '—'}</b></div>
            <div class="metric"><span class="label">min H</span><b>${single.minHeight ?? '—'}</b></div>
            <div class="metric"><span class="label">max W</span><b>${single.maxWidth ?? '—'}</b></div>
            <div class="metric"><span class="label">max H</span><b>${single.maxHeight ?? '—'}</b></div>
          </div>
        ` : nothing}
        ${diagnostics.issues.length ? html`
          <div class="issues">
            ${diagnostics.issues.map((issue) => html`<div class="issue">${issue.constraintId} · ${issue.status} · ${issue.message}</div>`)}
          </div>
        ` : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-inspector-panel': FrakonCanvasV2InspectorPanel;
  }
}
