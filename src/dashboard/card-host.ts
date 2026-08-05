import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';

interface HostedCardElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig?: (config: Record<string, unknown>) => void;
}

export function resolveCardTag(type: unknown): string | undefined {
  if (typeof type !== 'string') return undefined;
  return type.startsWith('custom:') ? type.slice('custom:'.length) : undefined;
}

@customElement('frakon-card-host')
export class FrakonCardHost extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) config: Record<string, unknown> = {};
  @query('.host') private host?: HTMLDivElement;

  static styles = css`
    :host, .host { display:block; width:100%; height:100%; min-width:0; }
    .host > * { display:block; width:100%; height:100%; box-sizing:border-box; }
    .error { display:grid; place-items:center; min-height:100%; padding:16px; text-align:center; opacity:.68; }
  `;

  protected firstUpdated(): void { this.mountCard(); }
  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('config') || changed.has('hass')) this.mountCard();
  }

  private mountCard(): void {
    if (!this.host) return;
    const tag = resolveCardTag(this.config.type);
    this.host.replaceChildren();
    if (!tag || !customElements.get(tag)) {
      const error = document.createElement('div');
      error.className = 'error';
      error.textContent = tag ? `Card ${tag} is not registered.` : 'Unsupported card type.';
      this.host.append(error);
      return;
    }
    const element = document.createElement(tag) as HostedCardElement;
    try {
      element.setConfig?.(this.config);
      element.hass = this.hass;
      this.host.append(element);
    } catch (error) {
      const message = document.createElement('div');
      message.className = 'error';
      message.textContent = error instanceof Error ? error.message : 'Unable to render card.';
      this.host.append(message);
    }
  }

  render() { return html`<div class="host"></div>`; }
}

declare global { interface HTMLElementTagNameMap { 'frakon-card-host': FrakonCardHost; } }
