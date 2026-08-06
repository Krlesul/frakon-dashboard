import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { DashboardIntelligenceUrgencyDiagnostic } from '../../../src/dashboard/dashboard-intelligence-stabilizer';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { HomeAssistantLike } from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';
import type {
  FrakonDashboardIntelligenceContextChangedDetail,
  FrakonDashboardIntelligenceStabilizationStatusDetail,
} from './dashboard-intelligence-signal-bridge';
import './dashboard-intelligence-safe-panel';
import './dashboard-intelligence-signal-bridge';

@customElement('frakon-dashboard-intelligence-live-panel')
export class FrakonDashboardIntelligenceLivePanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) hass?: HomeAssistantLike;
  @property({ attribute: false }) tracker?: Pick<DashboardInteractionTracker, 'snapshot'>;
  @property() device: DashboardDeviceContext = 'desktop';
  @property({ type: Number }) urgencyConfirmMs = 5_000;
  @property({ type: Number }) urgencyReleaseMs = 15_000;
  @property({ type: Number }) minimumEmissionIntervalMs = 2_000;

  @state() private automaticContext?: DashboardIntelligenceContext;
  @state() private diagnostics: DashboardIntelligenceUrgencyDiagnostic[] = [];
  @state() private nextEvaluationAt?: number;

  static styles = css`
    :host { display:block; }
    .status {
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:10px;
      padding:9px 11px;
      border:1px solid rgb(105 167 255 / 18%);
      border-radius:10px;
      background:rgb(105 167 255 / 6%);
      font:600 11px/1.4 Inter,system-ui,sans-serif;
    }
    .pill { padding:4px 7px; border-radius:999px; background:rgb(255 255 255 / 7%); }
    .confirming { color:#9ec8ff; }
    .cooldown { color:#ffc27a; }
    .stable { color:#8be1b4; }
    .critical { color:#ff8f8f; background:rgb(255 91 91 / 12%); }
    .next { margin-left:auto; opacity:.65; font-weight:500; }
  `;

  private onContextChanged(event: CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>): void {
    this.automaticContext = event.detail.context;
  }

  private onStabilizationStatus(event: CustomEvent<FrakonDashboardIntelligenceStabilizationStatusDetail>): void {
    this.diagnostics = event.detail.diagnostics;
    this.nextEvaluationAt = event.detail.nextEvaluationAt;
  }

  private renderStatus() {
    const confirming = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'confirming').length;
    const cooldown = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'cooldown').length;
    const stableUrgent = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'stable' && diagnostic.stableUrgent).length;
    const critical = this.diagnostics.filter((diagnostic) => diagnostic.stableUrgent && diagnostic.severity === 'critical').length;
    if (confirming === 0 && cooldown === 0 && stableUrgent === 0) return nothing;

    const nextSeconds = this.nextEvaluationAt === undefined
      ? undefined
      : Math.max(0, Math.ceil((this.nextEvaluationAt - Date.now()) / 1_000));

    return html`
      <div class="status" aria-live="polite">
        ${critical > 0 ? html`<span class="pill critical">${critical} critical</span>` : nothing}
        ${stableUrgent > 0 ? html`<span class="pill stable">${stableUrgent} urgent</span>` : nothing}
        ${confirming > 0 ? html`<span class="pill confirming">${confirming} confirming</span>` : nothing}
        ${cooldown > 0 ? html`<span class="pill cooldown">${cooldown} cooling down</span>` : nothing}
        ${nextSeconds !== undefined ? html`<span class="next">Next check in ${nextSeconds}s</span>` : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <frakon-dashboard-intelligence-signal-bridge
        .hass=${this.hass}
        .document=${this.document}
        .tracker=${this.tracker}
        .device=${this.device}
        .urgencyConfirmMs=${this.urgencyConfirmMs}
        .urgencyReleaseMs=${this.urgencyReleaseMs}
        .minimumEmissionIntervalMs=${this.minimumEmissionIntervalMs}
        @frakon-dashboard-intelligence-context-changed=${this.onContextChanged}
        @frakon-dashboard-intelligence-stabilization-status=${this.onStabilizationStatus}
      ></frakon-dashboard-intelligence-signal-bridge>
      ${this.renderStatus()}
      <frakon-dashboard-intelligence-safe-panel
        .document=${this.document}
        .automaticContext=${this.automaticContext}
      ></frakon-dashboard-intelligence-safe-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-intelligence-live-panel': FrakonDashboardIntelligenceLivePanel;
  }
}
