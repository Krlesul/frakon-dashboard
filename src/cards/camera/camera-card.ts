import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonCameraCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-camera-card';
  entity: string;
  aspect_ratio?: string;
  show_state?: boolean;
}

const DEFAULT_ASPECT_RATIO = '16 / 9';
const SAFE_ASPECT_RATIO_RE = /^\s*(?:\d+(?:\.\d+)?)(?:\s*\/\s*(?:\d+(?:\.\d+)?))?\s*$/;

@customElement('frakon-camera-card')
export class FrakonCameraCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonCameraCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    :host { display: block; height: 100%; }
    .card { position: relative; min-height: 220px; height: 100%; overflow: hidden; border: 1px solid var(--frakon-border); border-radius: var(--frakon-radius-card); background: var(--frakon-surface); box-shadow: 0 18px 50px rgb(0 0 0 / 18%); }
    .media { width: 100%; height: 100%; min-height: 220px; object-fit: cover; background: #0a0d12; }
    .fallback { display: grid; place-items: center; min-height: 220px; font-size: 44px; opacity: .55; }
    .overlay { position: absolute; inset: auto 0 0; padding: 44px 18px 16px; background: linear-gradient(transparent, rgb(0 0 0 / 72%)); color: white; }
    .name { font-size: 19px; font-weight: 700; }
    .state { margin-top: 4px; font-size: 13px; opacity: .72; }
  `;

  setConfig(config: FrakonCameraCardConfig): void {
    if (!config.entity?.startsWith('camera.')) throw new Error('FRAKON Camera Card requires a camera entity.');
    const aspectRatio = (config.aspect_ratio ?? DEFAULT_ASPECT_RATIO).trim();
    if (!SAFE_ASPECT_RATIO_RE.test(aspectRatio)) {
      throw new Error('FRAKON Camera Card aspect_ratio must be a positive numeric ratio such as 16 / 9.');
    }
    const parts = aspectRatio.split('/').map((value) => Number(value.trim()));
    if (parts.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error('FRAKON Camera Card aspect_ratio values must be greater than zero.');
    }
    this.config = { ...config, aspect_ratio: aspectRatio, show_state: config.show_state ?? true };
  }

  getCardSize(): number { return 5; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-camera-card-editor'); }
  static getStubConfig(): FrakonCameraCardConfig {
    return { type: 'custom:frakon-camera-card', entity: 'camera.example', aspect_ratio: DEFAULT_ASPECT_RATIO, show_state: true };
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card"><div class="fallback">⌁</div></article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const image = typeof entity.attributes.entity_picture === 'string' ? entity.attributes.entity_picture : undefined;
    return html`
      <article class="card" style=${`aspect-ratio:${this.config.aspect_ratio}`}>
        ${image ? html`<img class="media" src=${this.hass.hassUrl?.(image) ?? image} alt=${name}>` : html`<div class="fallback">⌁</div>`}
        <div class="overlay"><div class="name">${name}</div>${this.config.show_state ? html`<div class="state">${entity.state}</div>` : nothing}</div>
      </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-camera-card': FrakonCameraCard; } }
