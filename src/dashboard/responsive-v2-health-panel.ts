import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import type { ResponsiveCanvasV2HealthReport } from './responsive-v2-health-report';
import { responsiveV2HealthTranslate, type ResponsiveV2HealthTranslationKey } from './responsive-v2-health-i18n';

@customElement('frakon-responsive-v2-health-panel')
export class FrakonResponsiveV2HealthPanel extends LitElement {
  @property({ attribute: false }) report?: ResponsiveCanvasV2HealthReport;
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:10px; padding:12px; border-radius:14px; border:1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background:color-mix(in srgb, var(--card-background-color) 92%, var(--primary-color) 8%); }
    .head { display:flex; gap:8px; align-items:center; justify-content:space-between; font-size:12px; font-weight:700; }
    .status { padding:4px 8px; border-radius:999px; font-size:11px; background:color-mix(in srgb, var(--primary-color) 14%, transparent); }
    .status.blocked,.status.conflict { background:color-mix(in srgb, #f0a85a 20%, transparent); }
    .status.error { background:color-mix(in srgb, #ff4d67 18%, transparent); }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
    .row { display:flex; justify-content:space-between; gap:12px; padding:6px 8px; border-radius:9px; font-size:11px; background:color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); }
    .key { opacity:.68; }
    .value { text-align:right; overflow-wrap:anywhere; }
    .wide { grid-column:1 / -1; }
    .error { padding:7px 8px; border-radius:9px; font-size:11px; background:color-mix(in srgb, #ff4d67 16%, transparent); }
    @media (max-width:600px) { .grid { grid-template-columns:1fr; } .wide { grid-column:auto; } }
  `;

  private t(key: ResponsiveV2HealthTranslationKey): string { return responsiveV2HealthTranslate(this.language, key); }
  private yn(value: boolean): string { return this.t(value ? 'yes' : 'no'); }
  private list(values: string[]): string { return values.length ? values.join(', ') : this.t('none'); }
  private optional(value: string | number | undefined): string { return value === undefined ? '—' : String(value); }

  render() {
    const report = this.report;
    if (!report) return nothing;
    return html`<section class="panel" aria-label=${this.t('title')}>
      <div class="head"><span>${this.t('title')}</span><span class="status ${report.status}">${this.t(report.status)}</span></div>
      <div class="grid">
        <div class="row"><span class="key">${this.t('contract')}</span><span class="value">${report.contractVersion ?? '—'}</span></div>
        <div class="row"><span class="key">${this.t('compatible')}</span><span class="value">${this.yn(report.contractCompatible)}</span></div>
        <div class="row"><span class="key">${this.t('read')}</span><span class="value">${this.yn(report.readEnabled)}</span></div>
        <div class="row"><span class="key">${this.t('write')}</span><span class="value">${this.yn(report.writeEnabled)}</span></div>
        <div class="row"><span class="key">${this.t('atomicRevision')}</span><span class="value">${this.yn(report.atomicRevision)}</span></div>
        <div class="row"><span class="key">${this.t('revisionSync')}</span><span class="value">${this.yn(report.revisionSync)}</span></div>
        <div class="row"><span class="key">${this.t('maxItems')}</span><span class="value">${this.optional(report.maxItems)}</span></div>
        <div class="row"><span class="key">${this.t('maxConstraints')}</span><span class="value">${this.optional(report.maxConstraints)}</span></div>
        <div class="row wide"><span class="key">${this.t('maxSerializedBytes')}</span><span class="value">${this.optional(report.maxSerializedBytes)}</span></div>
        <div class="row wide"><span class="key">${this.t('storageNamespace')}</span><span class="value">${this.optional(report.storageNamespace)}</span></div>
        <div class="row wide"><span class="key">${this.t('baseRevision')}</span><span class="value">${report.baseRevision ?? '—'}</span></div>
        <div class="row wide"><span class="key">${this.t('dirtyBreakpoints')}</span><span class="value">${this.list(report.dirtyBreakpoints)}</span></div>
        <div class="row wide"><span class="key">${this.t('conflictBreakpoints')}</span><span class="value">${this.list(report.conflictBreakpoints)}</span></div>
        <div class="row wide"><span class="key">${this.t('loadEndpoint')}</span><span class="value">${this.optional(report.loadEndpoint)}</span></div>
        <div class="row wide"><span class="key">${this.t('saveEndpoint')}</span><span class="value">${this.optional(report.saveEndpoint)}</span></div>
        <div class="row wide"><span class="key">${this.t('removeEndpoint')}</span><span class="value">${this.optional(report.removeEndpoint)}</span></div>
      </div>
      ${report.error ? html`<div class="error">${report.error}</div>` : nothing}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-responsive-v2-health-panel': FrakonResponsiveV2HealthPanel; } }
