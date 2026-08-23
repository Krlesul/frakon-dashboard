import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonRoomCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-room-card';
  entity: string;
  temperature_entity?: string;
  humidity_entity?: string;
  light_entities?: string[];
}

@customElement('frakon-room-card')
export class FrakonRoomCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonRoomCardConfig;
  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:180px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%)}
    .name{font-size:22px;font-weight:700}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:26px}.metric{padding:14px;border-radius:16px;background:color-mix(in srgb,var(--frakon-accent) 8%,transparent)}.label{font-size:12px;opacity:.6}.value{margin-top:6px;font-size:22px;font-weight:700}.actions{margin-top:18px}button{min-height:42px;padding:0 16px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer}
  `;
  setConfig(config: FrakonRoomCardConfig): void {
    if (!config.entity) throw new Error('FRAKON Room Card requires a primary entity.');
    const lightEntities = config.light_entities ?? [];
    if (!Array.isArray(lightEntities) || lightEntities.some((entityId) => typeof entityId !== 'string' || !entityId.startsWith('light.'))) {
      throw new Error('FRAKON Room Card light_entities must contain only light entities.');
    }
    this.config = { ...config, light_entities: [...lightEntities] };
  }
  getCardSize(): number { return 5; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-room-card-editor'); }
  static getStubConfig(): FrakonRoomCardConfig {
    return { type: 'custom:frakon-room-card', entity: 'sensor.room', light_entities: [] };
  }
  private value(entityId?: string): string {
    if (!entityId || !this.hass) return '—';
    const entity = this.hass.states[entityId];
    if (!entity) return '—';
    const unit = entity.attributes.unit_of_measurement ? ` ${String(entity.attributes.unit_of_measurement)}` : '';
    return `${entity.state}${unit}`;
  }
  private toggleLights(): void {
    if (!this.hass || !this.config?.light_entities?.length) return;
    const anyOn = this.config.light_entities.some((id) => this.hass?.states[id]?.state === 'on');
    for (const entityId of this.config.light_entities) void this.hass.callService('light', anyOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
  }
  render() {
    if (!this.hass || !this.config) return nothing;
    const primary = this.hass.states[this.config.entity];
    const name = this.config.name ?? String(primary?.attributes.friendly_name ?? this.config.entity);
    const lights = this.config.light_entities ?? [];
    const onCount = lights.filter((id) => this.hass?.states[id]?.state === 'on').length;
    return html`<article class="card"><div class="name">${name}</div><div class="summary"><div class="metric"><div class="label">Temperature</div><div class="value">${this.value(this.config.temperature_entity)}</div></div><div class="metric"><div class="label">Humidity</div><div class="value">${this.value(this.config.humidity_entity)}</div></div><div class="metric"><div class="label">Lights</div><div class="value">${onCount}/${lights.length}</div></div></div>${lights.length ? html`<div class="actions"><button @click=${this.toggleLights}>${onCount ? 'Turn all off' : 'Turn all on'}</button></div>` : nothing}</article>`;
  }
}
declare global { interface HTMLElementTagNameMap { 'frakon-room-card': FrakonRoomCard; } }
