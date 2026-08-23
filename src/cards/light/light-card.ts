import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import { resolveLanguage, translate } from '../../i18n';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonLightCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-light-card';
  entity: string;
  show_brightness?: boolean;
  show_color_temperature?: boolean;
  compact?: boolean;
}

@customElement('frakon-light-card')
export class FrakonLightCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonLightCardConfig;
  @state() private pending = false;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    :host { display: block; height: 100%; }
    .card { position: relative; min-height: 168px; height: 100%; padding: 20px; overflow: hidden; border: 1px solid var(--frakon-border); border-radius: var(--frakon-radius-card); background: var(--frakon-surface); box-shadow: 0 18px 50px rgb(0 0 0 / 18%); backdrop-filter: blur(24px) saturate(130%); }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .identity { min-width: 0; }
    .eyebrow { opacity: .58; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; }
    .name { margin-top: 6px; overflow: hidden; font-size: 21px; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
    button { width: 48px; height: 48px; border: 0; border-radius: 16px; color: inherit; background: color-mix(in srgb, var(--frakon-accent) 14%, transparent); cursor: pointer; transition: transform 140ms ease, background 140ms ease; }
    button:hover { transform: scale(1.04); }
    button[aria-pressed='true'] { background: var(--frakon-accent); color: #07101d; box-shadow: 0 8px 24px color-mix(in srgb, var(--frakon-accent) 36%, transparent); }
    button:disabled { opacity: .55; cursor: wait; }
    .metrics { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end; margin-top: 34px; }
    .state { font-size: 14px; opacity: .7; }
    .value { margin-top: 4px; font-size: 30px; font-weight: 720; letter-spacing: -.03em; }
    input[type='range'] { width: 100%; margin: 20px 0 0; accent-color: var(--frakon-accent); }
    .glow { position: absolute; right: -38px; bottom: -65px; width: 190px; height: 190px; border-radius: 50%; background: var(--frakon-accent); filter: blur(70px); opacity: .28; pointer-events: none; }
    .unavailable { opacity: .55; }
  `;

  setConfig(config: FrakonLightCardConfig): void {
    if (!config.entity?.startsWith('light.')) throw new Error('FRAKON Light Card requires a light entity.');
    this.config = { show_brightness: true, show_color_temperature: true, ...config };
  }

  getCardSize(): number { return this.config?.compact ? 3 : 4; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-light-card-editor'); }
  static getStubConfig(): FrakonLightCardConfig { return { type: 'custom:frakon-light-card', entity: 'light.example', show_brightness: true, show_color_temperature: true }; }

  private async toggle(): Promise<void> {
    if (!this.hass || !this.config || this.pending) return;
    this.pending = true;
    try { await this.hass.callService('light', 'toggle', { entity_id: this.config.entity }); }
    finally { this.pending = false; }
  }

  private async setBrightness(event: Event): Promise<void> {
    if (!this.hass || !this.config) return;
    const brightnessPct = Number((event.target as HTMLInputElement).value);
    await this.hass.callService('light', 'turn_on', { entity_id: this.config.entity, brightness_pct: brightnessPct });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    const language = resolveLanguage(this.config.language, this.hass.locale?.language, this.hass.language, navigator.language);
    if (!entity) return html`<article class="card unavailable">${translate(language, 'entityMissing')}</article>`;
    const unavailable = entity.state === 'unavailable';
    const on = entity.state === 'on';
    const rawBrightness = typeof entity.attributes.brightness === 'number' ? entity.attributes.brightness : 0;
    const brightness = Math.round((rawBrightness / 255) * 100);
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const stateLabel = unavailable ? translate(language, 'unavailable') : translate(language, on ? 'on' : 'off');

    return html`
      <article class="card ${unavailable ? 'unavailable' : ''}">
        ${on ? html`<div class="glow"></div>` : nothing}
        <div class="header">
          <div class="identity"><div class="eyebrow">FRAKON LIGHT</div><div class="name">${name}</div></div>
          <button aria-label="Toggle light" aria-pressed=${String(on)} ?disabled=${unavailable || this.pending} @click=${this.toggle}>${on ? '●' : '○'}</button>
        </div>
        <div class="metrics"><div><div class="state">${stateLabel}</div><div class="value">${on ? `${brightness}%` : '—'}</div></div></div>
        ${this.config.show_brightness ? html`<input aria-label=${translate(language, 'brightness')} type="range" min="1" max="100" .value=${String(Math.max(brightness, 1))} ?disabled=${unavailable} @change=${this.setBrightness}>` : nothing}
      </article>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-light-card': FrakonLightCard; } }
