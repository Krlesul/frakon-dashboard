import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  createDashboardEmergencyFocusState,
  dashboardEmergencyFocusIndex,
  nextDashboardEmergencyFocusTarget,
  type DashboardEmergencyFocusState,
} from '../../../src/dashboard/dashboard-emergency-focus';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { DashboardIntelligenceUrgencyDiagnostic } from '../../../src/dashboard/dashboard-intelligence-stabilizer';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import { homeAssistantLanguage, type HomeAssistantLike } from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';
import type {
  FrakonDashboardIntelligenceContextChangedDetail,
  FrakonDashboardIntelligenceStabilizationStatusDetail,
} from './dashboard-intelligence-signal-bridge';
import './dashboard-emergency-focus-bridge';
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
  @property({ type: Boolean }) emergencyAutoFocus = true;

  @state() private automaticContext?: DashboardIntelligenceContext;
  @state() private diagnostics: DashboardIntelligenceUrgencyDiagnostic[] = [];
  @state() private nextEvaluationAt?: number;
  @state() private emergencyActiveItemId = '';
  @state() private emergencyFocusToken = 0;
  @state() private emergencyRestoreToken = 0;

  static styles = css`
    :host { display:block; }
    .status { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px; padding:9px 11px; border:1px solid rgb(105 167 255 / 18%); border-radius:10px; background:rgb(105 167 255 / 6%); font:600 11px/1.4 Inter,system-ui,sans-serif; }
    .pill { padding:4px 7px; border-radius:999px; background:rgb(255 255 255 / 7%); }
    .confirming { color:#9ec8ff; }
    .cooldown { color:#ffc27a; }
    .stable { color:#8be1b4; }
    .critical { color:#ff8f8f; background:rgb(255 91 91 / 12%); }
    .next { margin-left:auto; opacity:.65; font-weight:500; }
    .emergency-controls { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin:-2px 0 10px; padding:10px 11px; border:1px solid rgb(255 91 91 / 32%); border-radius:11px; background:rgb(255 91 91 / 8%); font:600 11px/1.35 Inter,system-ui,sans-serif; }
    .emergency-controls strong { margin-right:auto; }
    .emergency-controls button { border:1px solid rgb(255 255 255 / 14%); border-radius:8px; padding:6px 9px; color:inherit; background:rgb(255 255 255 / 7%); cursor:pointer; font:inherit; }
    .emergency-controls button.primary { border-color:rgb(255 91 91 / 46%); background:rgb(255 91 91 / 14%); }
    .emergency-controls button:disabled { opacity:.4; cursor:not-allowed; }
  `;

  private onContextChanged(event: CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>): void {
    this.automaticContext = event.detail.context;
    const focus = this.emergencyFocus(event.detail.context);
    if (!focus.active) { this.emergencyActiveItemId = ''; return; }
    if (!focus.targets.some((target) => target.itemId === this.emergencyActiveItemId)) this.emergencyActiveItemId = focus.primary?.itemId ?? '';
  }

  private onStabilizationStatus(event: CustomEvent<FrakonDashboardIntelligenceStabilizationStatusDetail>): void {
    this.diagnostics = event.detail.diagnostics;
    this.nextEvaluationAt = event.detail.nextEvaluationAt;
  }

  private emergencyFocus(context = this.automaticContext): DashboardEmergencyFocusState {
    return this.document ? createDashboardEmergencyFocusState(this.document, context) : { active: false, targets: [] };
  }

  private moveEmergencyFocus(direction: 1 | -1): void {
    const focus = this.emergencyFocus();
    const target = nextDashboardEmergencyFocusTarget(focus, this.currentEmergencyItemId(focus), direction);
    if (!target) return;
    this.emergencyActiveItemId = target.itemId;
    this.emergencyFocusToken += 1;
  }

  private currentEmergencyItemId(focus: DashboardEmergencyFocusState): string {
    if (this.emergencyActiveItemId && focus.targets.some((target) => target.itemId === this.emergencyActiveItemId)) return this.emergencyActiveItemId;
    return focus.primary?.itemId ?? '';
  }

  private restoreEmergencyView(): void { this.emergencyRestoreToken += 1; }
  private refocusEmergencyView(): void { this.emergencyFocusToken += 1; }

  private renderStatus() {
    const confirming = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'confirming').length;
    const cooldown = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'cooldown').length;
    const stableUrgent = this.diagnostics.filter((diagnostic) => diagnostic.phase === 'stable' && diagnostic.stableUrgent).length;
    const critical = this.diagnostics.filter((diagnostic) => diagnostic.stableUrgent && diagnostic.severity === 'critical').length;
    if (confirming === 0 && cooldown === 0 && stableUrgent === 0) return nothing;
    const nextSeconds = this.nextEvaluationAt === undefined ? undefined : Math.max(0, Math.ceil((this.nextEvaluationAt - Date.now()) / 1_000));
    return html`<div class="status" aria-live="polite">${critical > 0 ? html`<span class="pill critical">${critical} critical · Emergency Focus active</span>` : nothing}${stableUrgent > 0 ? html`<span class="pill stable">${stableUrgent} urgent</span>` : nothing}${confirming > 0 ? html`<span class="pill confirming">${confirming} confirming</span>` : nothing}${cooldown > 0 ? html`<span class="pill cooldown">${cooldown} cooling down</span>` : nothing}${nextSeconds !== undefined ? html`<span class="next">Next check in ${nextSeconds}s</span>` : nothing}</div>`;
  }

  private renderEmergencyControls(focus: DashboardEmergencyFocusState) {
    if (!focus.active) return nothing;
    const currentId = this.currentEmergencyItemId(focus);
    const index = dashboardEmergencyFocusIndex(focus, currentId);
    return html`<div class="emergency-controls" role="group" aria-label="Emergency Focus navigation"><strong>Critical ${Math.max(0, index) + 1} of ${focus.targets.length} · ${currentId}</strong><button ?disabled=${focus.targets.length <= 1} @click=${() => this.moveEmergencyFocus(-1)}>Previous</button><button ?disabled=${focus.targets.length <= 1} @click=${() => this.moveEmergencyFocus(1)}>Next</button><button @click=${this.restoreEmergencyView}>Return to previous view</button><button class="primary" @click=${this.refocusEmergencyView}>Focus again</button></div>`;
  }

  render() {
    const emergencyFocus = this.emergencyFocus();
    const emergencyItemId = this.currentEmergencyItemId(emergencyFocus);
    const locale = homeAssistantLanguage(this.hass);
    return html`
      <frakon-dashboard-intelligence-signal-bridge .hass=${this.hass} .document=${this.document} .tracker=${this.tracker} .device=${this.device} .urgencyConfirmMs=${this.urgencyConfirmMs} .urgencyReleaseMs=${this.urgencyReleaseMs} .minimumEmissionIntervalMs=${this.minimumEmissionIntervalMs} @frakon-dashboard-intelligence-context-changed=${this.onContextChanged} @frakon-dashboard-intelligence-stabilization-status=${this.onStabilizationStatus}></frakon-dashboard-intelligence-signal-bridge>
      <frakon-dashboard-emergency-focus-bridge .focusState=${emergencyFocus} .document=${this.document} .autoFocus=${this.emergencyAutoFocus} .activeItemId=${emergencyItemId} .locale=${locale} .focusToken=${this.emergencyFocusToken} .restoreToken=${this.emergencyRestoreToken}></frakon-dashboard-emergency-focus-bridge>
      ${this.renderStatus()}${this.renderEmergencyControls(emergencyFocus)}
      <frakon-dashboard-intelligence-safe-panel .document=${this.document} .automaticContext=${this.automaticContext}></frakon-dashboard-intelligence-safe-panel>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-intelligence-live-panel': FrakonDashboardIntelligenceLivePanel; } }
