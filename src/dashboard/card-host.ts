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

export function shouldRemountHostedCard(changed: ReadonlySet<PropertyKey>): boolean {
  return changed.has('config');
}

@customElement('frakon-card-host')
export class FrakonCardHost extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) config: Record<string, unknown> = {};
  @query('.host') private host?: HTMLDivElement;

  private mountedElement?: HostedCardElement;
  private intersectionObserver?: IntersectionObserver;
  private active = true;
  private deferInitialMountToUpdated = false;

  static styles = css`
    :host, .host { display:block; width:100%; height:100%; min-width:0; }
    .host > * { display:block; width:100%; height:100%; box-sizing:border-box; }
    .error { display:grid; place-items:center; min-height:100%; padding:16px; text-align:center; opacity:.68; }
  `;

  protected firstUpdated(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.active = true;
      this.deferInitialMountToUpdated = true;
      return;
    }

    this.active = false;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const nextActive = entry.isIntersecting || entry.intersectionRatio > 0;
        if (nextActive === this.active) return;
        this.active = nextActive;
        if (nextActive) this.mountCard();
        else this.unmountCard();
      },
      { root: null, rootMargin: '240px' },
    );
    this.intersectionObserver.observe(this);
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (!this.active) return;
    if (this.deferInitialMountToUpdated) {
      this.deferInitialMountToUpdated = false;
      this.mountCard();
      return;
    }
    if (shouldRemountHostedCard(new Set(changed.keys()))) {
      this.mountCard();
      return;
    }
    if (changed.has('hass') && this.mountedElement) this.mountedElement.hass = this.hass;
  }

  disconnectedCallback(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.unmountCard();
    super.disconnectedCallback();
  }

  private unmountCard(): void {
    this.mountedElement = undefined;
    this.host?.replaceChildren();
  }

  private mountCard(): void {
    if (!this.host || !this.active) return;
    const tag = resolveCardTag(this.config.type);
    this.mountedElement = undefined;
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
      this.mountedElement = element;
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
