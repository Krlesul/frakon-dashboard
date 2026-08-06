import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';

export interface FrakonDashboardInteractionDetail {
  itemId: string;
  timestamp: number;
}

@customElement('frakon-dashboard-interaction-observer')
export class FrakonDashboardInteractionObserver extends LitElement {
  @property({ attribute: false }) tracker?: DashboardInteractionTracker;
  @property({ type: Boolean }) enabled = true;

  private onInteraction(event: Event): void {
    if (!this.enabled || event.defaultPrevented) return;
    const itemId = itemIdFromEvent(event);
    if (!itemId) return;
    const timestamp = Date.now();
    this.tracker?.record(itemId, timestamp);
    this.dispatchEvent(new CustomEvent<FrakonDashboardInteractionDetail>('frakon-dashboard-item-interacted', {
      detail: { itemId, timestamp },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`<slot @click=${this.onInteraction} @change=${this.onInteraction}></slot>`;
  }
}

function itemIdFromEvent(event: Event): string | undefined {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.dataset.frakonIgnoreInteraction === 'true') return undefined;
    const id = node.dataset.frakonId;
    if (id) return id;
  }
  return undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-interaction-observer': FrakonDashboardInteractionObserver;
  }
}
