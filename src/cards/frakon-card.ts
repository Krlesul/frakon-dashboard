import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../design-system/tokens';
import { resolveLanguage, translate, type SupportedLanguage } from '../i18n';
import type { HomeAssistant, LovelaceCardConfig } from '../home-assistant/types';

@customElement('frakon-card')
export class FrakonCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: LovelaceCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card {
      position: relative;
      min-height: 132px;
      padding: 20px;
      overflow: hidden;
      border: 1px solid var(--frakon-border);
      border-radius: var(--frakon-radius-card);
      background: var(--frakon-surface);
      backdrop-filter: blur(24px) saturate(130%);
      box-shadow: 0 18px 50px rgb(0 0 0 / 18%);
      transition: transform 160ms ease, border-color 160ms ease;
    }
    .card.actionable { cursor: pointer; }
    .card.actionable:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--frakon-accent) 45%, transparent); }
    .card.actionable:focus-visible { outline: 2px solid var(--frakon-accent); outline-offset: 3px; }
    .eyebrow { opacity: .62; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    .name { margin-top: 8px; font-size: 22px; font-weight: 650; }
    .state { margin-top: 24px; font-size: 15px; opacity: .82; }
    .active { position: absolute; inset: auto -30px -55px auto; width: 150px; height: 150px; border-radius: 50%; background: var(--frakon-accent); filter: blur(55px); opacity: .3; }
  `;

  setConfig(config: LovelaceCardConfig): void {
    if (!config.entity) throw new Error('FRAKON Card requires an entity.');
    this.config = { tap_action: 'toggle', ...config };
  }

  getCardSize(): number { return 3; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-card-editor'); }
  static getStubConfig(): LovelaceCardConfig {
    return { type: 'custom:frakon-card', entity: 'light.example', tap_action: 'toggle' };
  }

  private get language(): SupportedLanguage {
    return resolveLanguage(this.config?.language, this.hass?.locale?.language, this.hass?.language, navigator.language);
  }

  private async activate(): Promise<void> {
    const entityId = this.config?.entity;
    const action = this.config?.tap_action ?? 'toggle';
    if (!entityId || !this.hass || action === 'none') return;

    if (action === 'more-info') {
      this.dispatchEvent(new CustomEvent('hass-more-info', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      }));
      return;
    }

    const [domain] = entityId.split('.');
    if (!domain) return;
    await this.hass.callService(domain, 'toggle', { entity_id: entityId });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if ((this.config?.tap_action ?? 'toggle') === 'none') return;
    event.preventDefault();
    void this.activate();
  }

  render() {
    if (!this.config || !this.hass) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<div class="card">${translate(this.language, 'entityMissing')}</div>`;
    const active = ['on', 'open', 'unlocked', 'playing', 'heat'].includes(entity.state);
    const friendlyName = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const stateLabel = entity.state === 'on' ? translate(this.language, 'on') : entity.state === 'off' ? translate(this.language, 'off') : entity.state;
    const actionable = (this.config.tap_action ?? 'toggle') !== 'none';

    return html`
      <article
        class="card ${actionable ? 'actionable' : ''}"
        role=${actionable ? 'button' : 'group'}
        tabindex=${actionable ? '0' : '-1'}
        @click=${() => { if (actionable) void this.activate(); }}
        @keydown=${this.handleKeydown}
      >
        ${active ? html`<div class="active"></div>` : nothing}
        <div class="eyebrow">FRAKON</div>
        <div class="name">${friendlyName}</div>
        <div class="state">${stateLabel}</div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'frakon-card': FrakonCard; }
}
