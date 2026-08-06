import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { HomeAssistantLike } from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';
import type { FrakonDashboardIntelligenceContextChangedDetail } from './dashboard-intelligence-signal-bridge';
import './dashboard-intelligence-panel';
import './dashboard-intelligence-signal-bridge';

@customElement('frakon-dashboard-intelligence-live-panel')
export class FrakonDashboardIntelligenceLivePanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) hass?: HomeAssistantLike;
  @property({ attribute: false }) tracker?: Pick<DashboardInteractionTracker, 'snapshot'>;
  @property() device: DashboardDeviceContext = 'desktop';
  @state() private automaticContext?: DashboardIntelligenceContext;

  static styles = css`:host{display:block}`;

  private onContextChanged(event: CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>): void {
    this.automaticContext = event.detail.context;
  }

  render() {
    return html`
      <frakon-dashboard-intelligence-signal-bridge
        .hass=${this.hass}
        .document=${this.document}
        .tracker=${this.tracker}
        .device=${this.device}
        @frakon-dashboard-intelligence-context-changed=${this.onContextChanged}
      ></frakon-dashboard-intelligence-signal-bridge>
      <frakon-dashboard-intelligence-panel
        .document=${this.document}
        .automaticContext=${this.automaticContext}
      ></frakon-dashboard-intelligence-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-intelligence-live-panel': FrakonDashboardIntelligenceLivePanel;
  }
}
