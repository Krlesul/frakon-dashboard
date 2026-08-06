import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import {
  DashboardIntelligenceStabilizer,
  type DashboardIntelligenceUrgencyDiagnostic,
} from '../../../src/dashboard/dashboard-intelligence-stabilizer';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import {
  buildDashboardIntelligenceContextFromHass,
  type HomeAssistantLike,
} from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';

export interface FrakonDashboardIntelligenceContextChangedDetail {
  context: DashboardIntelligenceContext;
}

export interface FrakonDashboardIntelligenceStabilizationStatusDetail {
  diagnostics: DashboardIntelligenceUrgencyDiagnostic[];
  nextEvaluationAt?: number;
}

@customElement('frakon-dashboard-intelligence-signal-bridge')
export class FrakonDashboardIntelligenceSignalBridge extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistantLike;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) tracker?: Pick<DashboardInteractionTracker, 'snapshot'>;
  @property() device: DashboardDeviceContext = 'desktop';
  @property({ type: Number }) refreshIntervalMs = 60_000;
  @property({ type: Number }) urgencyConfirmMs = 5_000;
  @property({ type: Number }) urgencyReleaseMs = 15_000;
  @property({ type: Number }) minimumEmissionIntervalMs = 2_000;

  private refreshTimer?: number;
  private evaluationTimer?: number;
  private stabilizer = this.createStabilizer();

  connectedCallback(): void {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback(): void {
    this.stopTimer();
    this.stopEvaluationTimer();
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('refreshIntervalMs')) this.startTimer();
    if (changed.has('urgencyConfirmMs') || changed.has('urgencyReleaseMs') || changed.has('minimumEmissionIntervalMs')) {
      this.stabilizer = this.createStabilizer();
    }
    if (changed.has('document')) this.stabilizer.reset();
    this.emitContext();
  }

  private createStabilizer(): DashboardIntelligenceStabilizer {
    return new DashboardIntelligenceStabilizer({
      urgencyConfirmMs: this.urgencyConfirmMs,
      urgencyReleaseMs: this.urgencyReleaseMs,
      minimumEmissionIntervalMs: this.minimumEmissionIntervalMs,
    });
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

  private stopEvaluationTimer(): void {
    if (this.evaluationTimer !== undefined) window.clearTimeout(this.evaluationTimer);
    this.evaluationTimer = undefined;
  }

  private scheduleEvaluation(timestamp?: number): void {
    this.stopEvaluationTimer();
    if (timestamp === undefined) return;
    const delay = Math.max(0, timestamp - Date.now());
    this.evaluationTimer = window.setTimeout(() => {
      this.evaluationTimer = undefined;
      this.emitContext();
    }, delay);
  }

  private emitStatus(diagnostics: DashboardIntelligenceUrgencyDiagnostic[], nextEvaluationAt?: number): void {
    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligenceStabilizationStatusDetail>(
      'frakon-dashboard-intelligence-stabilization-status',
      {
        detail: { diagnostics: structuredClone(diagnostics), nextEvaluationAt },
        bubbles: true,
        composed: true,
      },
    ));
  }

  private emitContext(): void {
    if (!this.document) return;
    const now = Date.now();
    const raw = buildDashboardIntelligenceContextFromHass(this.document, this.hass, {
      device: this.device,
      tracker: this.tracker,
      now,
    });
    const result = this.stabilizer.update(raw, now);
    this.scheduleEvaluation(result.nextEvaluationAt);
    this.emitStatus(result.diagnostics, result.nextEvaluationAt);
    if (!result.changed) return;

    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>(
      'frakon-dashboard-intelligence-context-changed',
      {
        detail: { context: structuredClone(result.context) },
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
