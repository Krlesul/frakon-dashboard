import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import type { SupportedLanguage } from '../i18n';
import './dashboard-build-info-badge';
import type { DashboardStorageTransport } from './dashboard-storage';
import { responsiveV2AlphaReadiness, type ResponsiveV2AlphaReadinessStatus } from './responsive-v2-alpha-readiness';
import { applyResponsiveV2SavedStateToParent, type ResponsiveV2ParentStateHost } from './responsive-v2-parent-state-bridge';
import './responsive-v2-persistence-action-panel';
import type { ResponsiveCanvasV2HealthReport } from './responsive-v2-health-report';
import { responsiveV2HealthTranslate, type ResponsiveV2HealthTranslationKey } from './responsive-v2-health-i18n';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

@customElement('frakon-responsive-v2-health-panel')
export class FrakonResponsiveV2HealthPanel extends LitElement {
  @property({ attribute: false }) report?: ResponsiveCanvasV2HealthReport;
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  static styles = css`
    :host { display:block; }
    .stack { display:grid; gap:10px; }
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

  private alphaStatus(status: ResponsiveV2AlphaReadinessStatus): string {
    const keys: Record<ResponsiveV2AlphaReadinessStatus, ResponsiveV2HealthTranslationKey> = {
      unavailable: 'alphaUnavailable',
      'contract-mismatch': 'alphaContractMismatch',
      'install-mismatch': 'alphaInstallMismatch',
      'read-ready': 'alphaReadReady',
      'dry-run-ready': 'alphaDryRunReady',
      'write-enabled': 'alphaWriteEnabled',
    };
    return this.t(keys[status]);
  }

  private inheritedHost(): ResponsiveV2ParentStateHost | undefined {
    const root = this.getRootNode();
    if (!(root instanceof ShadowRoot)) return undefined;
    return root.host as ResponsiveV2ParentStateHost;
  }

  private inheritedHass(): HomeAssistant | undefined {
    return (this.inheritedHost() as ResponsiveV2ParentStateHost & { hass?: HomeAssistant } | undefined)?.hass;
  }

  private transport(): DashboardStorageTransport | undefined {
    const hass = this.inheritedHass();
    if (!hass?.callWS) return undefined;
    return {
      request: <T>(command: string, payload: Record<string, unknown>) => hass.callWS!<T>({ type: command, ...payload }),
    };
  }

  private onSaved(event: CustomEvent<{ envelope: ResponsiveCanvasV2RevisionEnvelope }>): void {
    const host = this.inheritedHost();
    const controller = this.report?.editorContext?.controller;
    if (!host || !controller) return;
    applyResponsiveV2SavedStateToParent(host, event.detail.envelope.revision, controller.snapshot);
  }

  render() {
    const report = this.report;
    if (!report) return nothing;
    const context = report.editorContext;
    const readiness = responsiveV2AlphaReadiness(context?.capabilities, context?.controller);
    const hass = this.inheritedHass();
    const transport = this.transport();

    return html`<div class="stack">
      <frakon-dashboard-build-info-badge .hass=${hass}></frakon-dashboard-build-info-badge>
      <section class="panel" aria-label=${this.t('title')}>
        <div class="head"><span>${this.t('title')}</span><span class="status ${report.status}">${this.t(report.status)}</span></div>
        <div class="grid">
          <div class="row wide"><span class="key">${this.t('alphaReadiness')}</span><span class="value">${this.alphaStatus(readiness.status)}</span></div>
          <div class="row"><span class="key">${this.t('contract')}</span><span class="value">${report.contractVersion ?? '—'}</span></div>
          <div class="row"><span class="key">${this.t('compatible')}</span><span class="value">${this.yn(report.contractCompatible)}</span></div>
          <div class="row"><span class="key">${this.t('read')}</span><span class="value">${this.yn(report.readEnabled)}</span></div>
          <div class="row"><span class="key">${this.t('write')}</span><span class="value">${this.yn(report.writeEnabled)}</span></div>
          <div class="row"><span class="key">${this.t('atomicRevision')}</span><span class="value">${this.yn(report.atomicRevision)}</span></div>
          <div class="row"><span class="key">${this.t('revisionSync')}</span><span class="value">${this.yn(report.revisionSync)}</span></div>
          <div class="row"><span class="key">${this.t('maxItems')}</span><span class="value">${report.maxItems ?? '—'}</span></div>
          <div class="row"><span class="key">${this.t('maxConstraints')}</span><span class="value">${report.maxConstraints ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('maxSerializedBytes')}</span><span class="value">${report.maxSerializedBytes ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('storageNamespace')}</span><span class="value">${report.storageNamespace ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('baseRevision')}</span><span class="value">${report.baseRevision ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('dirtyBreakpoints')}</span><span class="value">${this.list(report.dirtyBreakpoints)}</span></div>
          <div class="row wide"><span class="key">${this.t('conflictBreakpoints')}</span><span class="value">${this.list(report.conflictBreakpoints)}</span></div>
          <div class="row wide"><span class="key">${this.t('loadEndpoint')}</span><span class="value">${report.loadEndpoint ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('dryRunEndpoint')}</span><span class="value">${report.dryRunEndpoint ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('saveEndpoint')}</span><span class="value">${report.saveEndpoint ?? '—'}</span></div>
          <div class="row wide"><span class="key">${this.t('removeEndpoint')}</span><span class="value">${report.removeEndpoint ?? '—'}</span></div>
        </div>
        ${report.error ? html`<div class="error">${report.error}</div>` : nothing}
      </section>
      ${context && transport ? html`
        <frakon-responsive-v2-persistence-action-panel
          .transport=${transport}
          .capabilities=${context.capabilities}
          .controller=${context.controller}
          .baseRevision=${context.baseRevision}
          .hasUnresolvedConflict=${context.hasUnresolvedConflict}
          .language=${this.language}
          @frakon-responsive-v2-saved=${this.onSaved}
        ></frakon-responsive-v2-persistence-action-panel>
      ` : nothing}
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-responsive-v2-health-panel': FrakonResponsiveV2HealthPanel; } }
