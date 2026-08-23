import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';

interface HostedCardElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig?: (config: Record<string, unknown>) => void;
}

type VisibilityCallback = (visible: boolean) => void;

const visibilityCallbacks = new WeakMap<Element, VisibilityCallback>();
let sharedVisibilityObserver: IntersectionObserver | undefined;

function visibilityObserver(): IntersectionObserver | undefined {
  if (typeof IntersectionObserver === 'undefined') return undefined;
  if (!sharedVisibilityObserver) {
    sharedVisibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityCallbacks.get(entry.target)?.(entry.isIntersecting || entry.intersectionRatio > 0);
        }
      },
      { root: null, rootMargin: '240px' },
    );
  }
  return sharedVisibilityObserver;
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
  private observed = false;
  private active = true;
  private deferInitialMountToUpdated = false;

  static styles = css`
    :host, .host { display:block; width:100%; height:100%; min-width:0; }
    .host > * { display:block; width:100%; height:100%; box-sizing:border-box; }
    .error { display:grid; place-items:center; min-height:100%; padding:16px; text-align:center; opacity:.68; }
  `;

  protected firstUpdated(): void {
    const observer = visibilityObserver();
    if (!observer) {
      this.active = true;
      this.deferInitialMountToUpdated = true;
      return;
    }

    this.active = false;
    visibilityCallbacks.set(this, (visible) => {
      if (visible === this.active) return;
      this.active = visible;
      if (visible) this.mountCard();
      else this.unmountCard();
    });
    observer.observe(this);
    this.observed = true;
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
    if (changed.has('hass') && this.mountedElement) this.updateMountedHass();
  }

  disconnectedCallback(): void {
    if (this.observed) sharedVisibilityObserver?.unobserve(this);
    visibilityCallbacks.delete(this);
    this.observed = false;
    this.unmountCard();
    super.disconnectedCallback();
  }

  private updateMountedHass(): void {
    if (!this.mountedElement) return;
    try {
      this.mountedElement.hass = this.hass;
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unable to update card state.');
    }
  }

  private unmountCard(): void {
    this.mountedElement = undefined;
    this.host?.replaceChildren();
  }

  private showError(message: string): void {
    if (!this.host) return;
    this.mountedElement = undefined;
    this.host.replaceChildren();
    const error = document.createElement('div');
    error.className = 'error';
    error.textContent = message;
    this.host.append(error);
  }

  private mountCard(): void {
    if (!this.host || !this.active) return;
    const tag = resolveCardTag(this.config.type);
    this.mountedElement = undefined;
    this.host.replaceChildren();
    if (!tag || !customElements.get(tag)) {
      this.showError(tag ? `Card ${tag} is not registered.` : 'Unsupported card type.');
      return;
    }
    const element = document.createElement(tag) as HostedCardElement;
    try {
      element.setConfig?.(this.config);
      element.hass = this.hass;
      this.host.append(element);
      this.mountedElement = element;
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unable to render card.');
    }
  }

  render() { return html`<div class="host"></div>`; }
}

declare global { interface HTMLElementTagNameMap { 'frakon-card-host': FrakonCardHost; } }
