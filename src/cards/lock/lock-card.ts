import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonLockCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-lock-card';
  entity: string;
  show_state?: boolean;
}

@customElement('frakon-lock-card')
export class FrakonLockCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonLockCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:150px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:18px}
    .name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65}.actions{display:flex;gap:8px;flex-wrap:wrap}button{min-width:92px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer;font:inherit;font-weight:650}.primary{background:color-mix(in srgb,var(--frakon-accent) 28%,transparent)}
  `;

  setConfig(config: FrakonLockCardConfig): void {
    if (!config.entity?.startsWith('lock.')) throw new Error('FRAKON Lock Card requires a lock entity.');
    this.config = { show_state: true, ...config };
  }

  getCardSize(): number { return 3; }

  private call(service: 'lock' | 'unlock'): void {
    if (!this.hass || !this.config) return;
    void this.hass.callService('lock', service, { entity_id: this.config.entity });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const locked = entity.state === 'locked';
    return html`<article class="card">
      <div><div class="name">${name}</div>${this.config.show_state ? html`<div class="state">${entity.state}</div>` : nothing}</div>
      <div class="actions"><button class=${locked ? '' : 'primary'} @click=${() => this.call('lock')}>Lock</button><button class=${locked ? 'primary' : ''} @click=${() => this.call('unlock')}>Unlock</button></div>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-lock-card': FrakonLockCard; } }
