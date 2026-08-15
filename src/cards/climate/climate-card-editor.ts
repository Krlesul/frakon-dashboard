import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonClimateCardConfig } from './climate-card';

interface ConfigChangedEventDetail {
  config: FrakonClimateCardConfig;
}

const MIN_STEP = 0.1;
const MAX_STEP = 5;

@customElement('frakon-climate-card-editor')
export class FrakonClimateCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonClimateCardConfig;

  static styles = css`
    :host { display: block; color: var(--primary-text-color); }
    .editor { display: grid; gap: 18px; padding: 4px 0; }
    .section { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--divider-color); border-radius: 16px; }
    .title { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .65; }
    label { display: grid; gap: 7px; font-size: 13px; }
    input, select { width: 100%; box-sizing: border-box; min-height: 42px; padding: 0 12px; border: 1px solid var(--divider-color); border-radius: 10px; color: inherit; background: var(--card-background-color); }
    .hint { margin: 0; font-size: 12px; line-height: 1.45; opacity: .62; }
  `;

  setConfig(config: FrakonClimateCardConfig): void {
    this.config = { step: 0.5, ...config };
  }

  private updateConfig<K extends keyof FrakonClimateCardConfig>(
    key: K,
    value: FrakonClimateCardConfig[K],
  ): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true,
    }));
  }

  private climateEntities(): string[] {
    return Object.keys(this.hass?.states ?? {})
      .filter((entityId) => entityId.startsWith('climate.'))
      .sort();
  }

  private updateStep(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const step = Number.isFinite(raw) ? Math.min(MAX_STEP, Math.max(MIN_STEP, raw)) : 0.5;
    this.updateConfig('step', step);
  }

  render() {
    if (!this.config) return nothing;
    const entities = this.climateEntities();
    return html`
      <div class="editor">
        <section class="section">
          <div class="title">Entity</div>
          <label>Climate entity
            <select
              .value=${this.config.entity}
              @change=${(event: Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}
            >
              ${entities.length === 0 && this.config.entity
                ? html`<option value=${this.config.entity}>${this.config.entity}</option>`
                : nothing}
              ${entities.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
            </select>
          </label>
          <label>Name
            <input
              type="text"
              .value=${this.config.name ?? ''}
              placeholder="Use entity name"
              @input=${(event: Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}
            >
          </label>
        </section>
        <section class="section">
          <div class="title">Temperature control</div>
          <label>Adjustment step (°)
            <input
              type="number"
              min=${String(MIN_STEP)}
              max=${String(MAX_STEP)}
              step="0.1"
              .value=${String(this.config.step ?? 0.5)}
              @change=${this.updateStep}
            >
          </label>
          <p class="hint">Controls how much the target temperature changes with each + or − action.</p>
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-climate-card-editor': FrakonClimateCardEditor;
  }
}
