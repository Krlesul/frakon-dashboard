import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import { loadFrakonDashboardBuildInfo, type FrakonDashboardBuildInfo } from './dashboard-build-info';
import { FRAKON_FRONTEND_BUILD, frakonBuildIdentityMatches } from './dashboard-frontend-build';

@customElement('frakon-dashboard-build-info-badge')
export class FrakonDashboardBuildInfoBadge extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private info?: FrakonDashboardBuildInfo;
  @state() private error?: string;
  private requestToken = 0;

  static styles = css`
    :host { display:block; }
    .badge { display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding:7px 9px; border-radius:10px; font-size:11px; background:color-mix(in srgb, var(--primary-color) 10%, transparent); }
    .badge.mismatch { background:color-mix(in srgb, #ff4d67 16%, transparent); }
    .commit { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; opacity:.78; }
    .error { color:var(--error-color,#ff4d67); }
    .mismatch-text { font-weight:700; color:var(--error-color,#ff4d67); }
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
    const backendCommit = this.info.sourceCommit === 'development'
      ? 'development'
      : this.info.sourceCommit.slice(0, 12);
    const frontendCommit = FRAKON_FRONTEND_BUILD.sourceCommit === 'development'
      ? 'development'
      : FRAKON_FRONTEND_BUILD.sourceCommit.slice(0, 12);
    const matches = frakonBuildIdentityMatches(FRAKON_FRONTEND_BUILD, this.info);

    if (!matches) {
      return html`<div class="badge mismatch">
        <span class="mismatch-text">FRAKON build mismatch</span>
        <span>frontend ${FRAKON_FRONTEND_BUILD.version}</span>
        <span class="commit">${frontendCommit}</span>
        <span>backend ${this.info.version}</span>
        <span class="commit">${backendCommit}</span>
      </div>`;
    }

    return html`<div class="badge">
      <strong>FRAKON ${this.info.version}</strong>
      <span class="commit">${backendCommit}</span>
      <span>contract ${this.info.responsiveContractVersion || '—'}</span>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-build-info-badge': FrakonDashboardBuildInfoBadge; } }
