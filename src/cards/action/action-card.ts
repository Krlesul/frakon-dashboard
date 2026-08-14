import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';
import { resolveLanguage, translate } from '../../i18n';
import { frakonActionLabel } from './action-card-i18n';
import { frakonActionService } from './action-card-state';

export interface FrakonActionCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-action-card';
  entity: string;
  show_state?: boolean;
}

@customElement('frakon-action-card')
export class FrakonActionCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonActionCardConfig;
  @state() private running = false;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:140px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:18px}
    .name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65;font-size:12px}.action{justify-self:start;min-width:110px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 22%,transparent);cursor:pointer;font:inherit;font-weight:680}.action:hover{background:color-mix(in srgb,var(--frakon-accent) 32%,transparent)}.action:disabled{opacity:.42;cursor:not-allowed}
  `;

  setConfig(config: FrakonActionCardConfig): void {
    if (!config.entity || !frakonActionService(config.entity)) {
      throw new Error('FRAKON Action Card requires button.*, input_button.*, script.* or scene.* entity.');
    }
    this.config = { show_state: false, ...config };
  }

  getCardSize(): number { return 3; }

  private async run(): Promise<void> {
    if (!this.hass || !this.config || this.running) return;
    const action = frakonActionService(this.config.entity);
    if (!action) return;
    this.running = true;
    try {
      await this.hass.callService(action.domain, action.service, { entity_id: this.config.entity });
    } finally {
      this.running = false;
    }
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const language = resolveLanguage(this.config.language, this.hass.locale?.language, this.hass.language, navigator.language);
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">${translate(language, 'entityMissing')}</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const unavailable = entity.state === 'unavailable';
    return html`<article class="card">
      <div><div class="name">${name}</div>${this.config.show_state ? html`<div class="state">${entity.state}</div>` : nothing}</div>
      <button class="action" ?disabled=${unavailable || this.running} @click=${this.run}>${frakonActionLabel(language, this.config.entity, unavailable)}</button>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-action-card': FrakonActionCard; } }
