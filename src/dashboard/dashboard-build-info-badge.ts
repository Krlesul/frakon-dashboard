import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import { loadFrakonDashboardBuildInfo, type FrakonDashboardBuildInfo } from './dashboard-build-info';

@customElement('frakon-dashboard-build-info-badge')
export class FrakonDashboardBuildInfoBadge extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private info?: FrakonDashboardBuildInfo;
  @state() private error?: string;
  private requestToken = 0;

  static styles = css`
    :host { display:block; }
    .badge { display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding:7px 9px; border-radius:10px; font-size:11px; background:color-mix(in srgb, var(--primary-color) 10%, transparent); }
    .commit { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; opacity:.78; }
    .error { color:var(--error-color,#ff4d67); }
  `;

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('hass')) return;
    void this.load();
  }

  private async load(): Promise<void> {
    const hass = this.hass;
    const token = ++this.requestToken;
    if (!hass?.callWS) {
      this.info = undefined;
      this.error = undefined;
      return;
    }
    try {
      const info = await loadFrakonDashboardBuildInfo({
        request: <T>(command: string, payload: Record<string, unknown>) => hass.callWS!<T>({ type: command, ...payload }),
      });
      if (token !== this.requestToken) return;
      this.info = info;
      this.error = undefined;
    } catch (error) {
      if (token !== this.requestToken) return;
      this.info = undefined;
      this.error = error instanceof Error ? error.message : String(error);
    }
  }

  render() {
    if (this.error) return html`<div class="badge error">Build info unavailable: ${this.error}</div>`;
    if (!this.info) return nothing;
    const commit = this.info.sourceCommit === 'development'
      ? 'development'
      : this.info.sourceCommit.slice(0, 12);
    return html`<div class="badge">
      <strong>FRAKON ${this.info.version}</strong>
      <span class="commit">${commit}</span>
      <span>contract ${this.info.responsiveContractVersion || '—'}</span>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-build-info-badge': FrakonDashboardBuildInfoBadge; } }
