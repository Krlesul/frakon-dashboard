import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import {
  buildDashboardIntelligenceContextFromHass,
  type HomeAssistantLike,
} from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';

export interface FrakonDashboardIntelligenceContextChangedDetail {
  context: DashboardIntelligenceContext;
}

@customElement('frakon-dashboard-intelligence-signal-bridge')
export class FrakonDashboardIntelligenceSignalBridge extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistantLike;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) tracker?: Pick<DashboardInteractionTracker, 'snapshot'>;
  @property() device: DashboardDeviceContext = 'desktop';
  @property({ type: Number }) refreshIntervalMs = 60_000;

  private refreshTimer?: number;
  private lastSignature = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback(): void {
    this.stopTimer();
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('refreshIntervalMs')) this.startTimer();
    this.emitContext();
  }

  private startTimer(): void {
    this.stopTimer();
    if (!Number.isFinite(this.refreshIntervalMs) || this.refreshIntervalMs <= 0) return;
    this.refreshTimer = window.setInterval(() => this.emitContext(), this.refreshIntervalMs);
  }

  private stopTimer(): void {
    if (this.refreshTimer !== undefined) window.clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }

  private emitContext(): void {
    if (!this.document) return;
    const context = buildDashboardIntelligenceContextFromHass(this.document, this.hass, {
      device: this.device,
      tracker: this.tracker,
      now: Date.now(),
    });
    const signature = JSON.stringify({
      device: context.device,
      daypart: context.daypart,
      usage: context.usage,
    });
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>(
      'frakon-dashboard-intelligence-context-changed',
      {
        detail: { context: structuredClone(context) },
        bubbles: true,
        composed: true,
      },
    ));
  }

  render() {
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-intelligence-signal-bridge': FrakonDashboardIntelligenceSignalBridge;
  }
}
