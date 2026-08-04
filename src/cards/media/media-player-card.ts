import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonMediaPlayerCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-media-player-card';
  entity: string;
  show_volume?: boolean;
}

@customElement('frakon-media-player-card')
export class FrakonMediaPlayerCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonMediaPlayerCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card { min-height: 180px; padding: 20px; border: 1px solid var(--frakon-border); border-radius: var(--frakon-radius-card); background: var(--frakon-surface); box-shadow: 0 18px 50px rgb(0 0 0 / 18%); }
    .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: .58; }
    .name { margin-top: 7px; font-size: 21px; font-weight: 700; }
    .track { margin-top: 24px; font-size: 15px; opacity: .82; }
    .controls { display: flex; gap: 10px; margin-top: 18px; }
    button { width: 44px; height: 44px; border: 0; border-radius: 14px; color: inherit; background: color-mix(in srgb, var(--frakon-accent) 14%, transparent); cursor: pointer; }
    input { width: 100%; margin-top: 18px; accent-color: var(--frakon-accent); }
  `;

  setConfig(config: FrakonMediaPlayerCardConfig): void {
    if (!config.entity?.startsWith('media_player.')) throw new Error('FRAKON Media Player Card requires a media_player entity.');
    this.config = { show_volume: true, ...config };
  }

  getCardSize(): number { return 4; }

  private async call(service: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!this.hass || !this.config) return;
    await this.hass.callService('media_player', service, { entity_id: this.config.entity, ...data });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const title = String(entity.attributes.media_title ?? entity.attributes.media_channel ?? entity.state);
    const volume = typeof entity.attributes.volume_level === 'number' ? entity.attributes.volume_level : 0;
    return html`
      <article class="card">
        <div class="eyebrow">FRAKON MEDIA</div><div class="name">${name}</div><div class="track">${title}</div>
        <div class="controls">
          <button @click=${() => this.call('media_previous_track')} aria-label="Previous">◀</button>
          <button @click=${() => this.call(entity.state === 'playing' ? 'media_pause' : 'media_play')} aria-label="Play or pause">${entity.state === 'playing' ? 'Ⅱ' : '▶'}</button>
          <button @click=${() => this.call('media_next_track')} aria-label="Next">▶</button>
        </div>
        ${this.config.show_volume ? html`<input type="range" min="0" max="1" step="0.01" .value=${String(volume)} @change=${(event: Event) => this.call('volume_set', { volume_level: Number((event.target as HTMLInputElement).value) })}>` : nothing}
      </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-media-player-card': FrakonMediaPlayerCard; } }
