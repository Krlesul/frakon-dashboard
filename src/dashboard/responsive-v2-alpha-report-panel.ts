import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import { loadFrakonDashboardBuildInfo } from './dashboard-build-info';
import type { DashboardStorageTransport } from './dashboard-storage';
import { responsiveV2AlphaReportTranslate } from './responsive-v2-alpha-report-i18n';
import {
  responsiveV2AlphaValidationReport,
  type ResponsiveV2DryRunObservation,
} from './responsive-v2-alpha-report';
import type { ResponsiveCanvasV2HealthReport } from './responsive-v2-health-report';

@customElement('frakon-responsive-v2-alpha-report-panel')
export class FrakonResponsiveV2AlphaReportPanel extends LitElement {
  @property({ attribute: false }) health?: ResponsiveCanvasV2HealthReport;
  @property({ attribute: false }) transport?: DashboardStorageTransport;
  @property({ attribute: false }) dryRun?: ResponsiveV2DryRunObservation;
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  @state() private copying = false;
  @state() private message?: string;

  static styles = css`
    :host { display:block; }
    .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    button { border:0; border-radius:9px; padding:7px 10px; color:inherit; background:color-mix(in srgb, var(--primary-color) 16%, transparent); cursor:pointer; font:inherit; font-size:11px; }
    button:disabled { opacity:.38; cursor:not-allowed; }
    .message { font-size:11px; opacity:.72; }
  `;

  private t(key: Parameters<typeof responsiveV2AlphaReportTranslate>[1]): string {
    return responsiveV2AlphaReportTranslate(this.language, key);
  }

  private async copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard copy was rejected.');
  }

  private async copyReport(): Promise<void> {
    const health = this.health;
    if (!health || this.copying) return;
    this.copying = true;
    this.message = undefined;
    try {
      let build;
      try {
        build = this.transport ? await loadFrakonDashboardBuildInfo(this.transport) : undefined;
      } catch {
        build = undefined;
      }
      const report = responsiveV2AlphaValidationReport({
        health,
        build,
        dryRun: this.dryRun,
      });
      await this.copyText(JSON.stringify(report, null, 2));
      this.message = this.t('copied');
    } catch {
      this.message = this.t('copyFailed');
    } finally {
      this.copying = false;
    }
  }

  render() {
    if (!this.health) return nothing;
    return html`<div class="row">
      <button ?disabled=${this.copying} @click=${this.copyReport}>${this.t('copyReport')}</button>
      ${this.message ? html`<span class="message">${this.message}</span>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-responsive-v2-alpha-report-panel': FrakonResponsiveV2AlphaReportPanel;
  }
}
