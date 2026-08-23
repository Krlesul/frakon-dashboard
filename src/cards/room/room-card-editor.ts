import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonRoomCardConfig } from './room-card';

interface ConfigChangedEventDetail { config: FrakonRoomCardConfig; }

@customElement('frakon-room-card-editor')
export class FrakonRoomCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonRoomCardConfig;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); }
    .editor { display:grid; gap:18px; padding:4px 0; }
    .section { display:grid; gap:12px; padding:16px; border:1px solid var(--divider-color); border-radius:16px; }
    .title { font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
    label { display:grid; gap:7px; font-size:13px; }
    input[type='text'], select { width:100%; box-sizing:border-box; min-height:42px; padding:0 12px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
    select[multiple] { min-height:160px; padding:8px; }
    .hint { margin:0; font-size:12px; line-height:1.45; opacity:.62; }
  `;

  setConfig(config: FrakonRoomCardConfig): void { this.config = { light_entities:[], ...config }; }

  private updateConfig<K extends keyof FrakonRoomCardConfig>(key: K, value: FrakonRoomCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail:{ config:this.config }, bubbles:true, composed:true,
    }));
  }

  private allEntities(): string[] { return Object.keys(this.hass?.states ?? {}).sort(); }
  private sensorEntities(deviceClass?: string): string[] {
    return Object.entries(this.hass?.states ?? {})
      .filter(([entityId, entity]) => entityId.startsWith('sensor.') && (!deviceClass || entity.attributes.device_class === deviceClass))
      .map(([entityId]) => entityId)
      .sort();
  }
  private lightEntities(): string[] {
    return Object.keys(this.hass?.states ?? {}).filter((entityId) => entityId.startsWith('light.')).sort();
  }

  private optionalEntityOptions(current: string | undefined, candidates: string[]) {
    const options = current && !candidates.includes(current) ? [current, ...candidates] : candidates;
    return html`<option value="">None</option>${options.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}`;
  }

  private updateLights(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.updateConfig('light_entities', Array.from(select.selectedOptions, (option) => option.value));
  }

  render() {
    if (!this.config) return nothing;
    const primary = this.allEntities();
    const temperatures = this.sensorEntities('temperature');
    const humidity = this.sensorEntities('humidity');
    const lights = this.lightEntities();
    const selectedLights = new Set(this.config.light_entities ?? []);
    return html`<div class="editor">
      <section class="section">
        <div class="title">Room identity</div>
        <label>Primary entity
          <select .value=${this.config.entity} @change=${(event:Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
            ${this.config.entity && !primary.includes(this.config.entity) ? html`<option value=${this.config.entity}>${this.config.entity}</option>` : nothing}
            ${primary.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
          </select>
        </label>
        <label>Room name<input type="text" .value=${this.config.name ?? ''} placeholder="Use primary entity name" @input=${(event:Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}></label>
      </section>
      <section class="section">
        <div class="title">Climate metrics</div>
        <label>Temperature sensor
          <select .value=${this.config.temperature_entity ?? ''} @change=${(event:Event) => this.updateConfig('temperature_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalEntityOptions(this.config.temperature_entity, temperatures)}</select>
        </label>
        <label>Humidity sensor
          <select .value=${this.config.humidity_entity ?? ''} @change=${(event:Event) => this.updateConfig('humidity_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalEntityOptions(this.config.humidity_entity, humidity)}</select>
        </label>
      </section>
      <section class="section">
        <div class="title">Room lights</div>
        <label>Lights
          <select multiple @change=${this.updateLights}>
            ${lights.map((entityId) => html`<option value=${entityId} ?selected=${selectedLights.has(entityId)}>${entityId}</option>`)}
          </select>
        </label>
        <p class="hint">Select all lights controlled by the room-level toggle.</p>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-room-card-editor': FrakonRoomCardEditor; } }
