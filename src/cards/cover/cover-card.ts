import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonCoverCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-cover-card';
  entity: string;
  show_position?: boolean;
}

@customElement('frakon-cover-card')
export class FrakonCoverCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonCoverCardConfig;
  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:150px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%)}
    .head,.actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65}.position{margin:24px 0 10px;font-size:30px;font-weight:720}.actions{justify-content:flex-start}button{min-width:48px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer}
  `;
  setConfig(config: FrakonCoverCardConfig): void {
    if (!config.entity?.startsWith('cover.')) throw new Error('FRAKON Cover Card requires a cover entity.');
    this.config = { show_position: true, ...config };
  }
  getCardSize(): number { return 4; }
  private call(service: string): void { if (this.hass && this.config) void this.hass.callService('cover', service, { entity_id: this.config.entity }); }
  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const position = typeof entity.attributes.current_position === 'number' ? entity.attributes.current_position : undefined;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    return html`<article class="card"><div class="head"><div><div class="name">${name}</div><div class="state">${entity.state}</div></div></div>${this.config.show_position ? html`<div class="position">${position ?? '—'}${position === undefined ? '' : '%'}</div>` : nothing}<div class="actions"><button @click=${() => this.call('open_cover')} aria-label="Open">▲</button><button @click=${() => this.call('stop_cover')} aria-label="Stop">■</button><button @click=${() => this.call('close_cover')} aria-label="Close">▼</button></div></article>`;
  }
}
declare global { interface HTMLElementTagNameMap { 'frakon-cover-card': FrakonCoverCard; } }
