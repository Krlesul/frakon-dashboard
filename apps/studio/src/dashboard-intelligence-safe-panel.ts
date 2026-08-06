import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  evaluateDashboardIntelligenceApplication,
} from '../../../src/dashboard/dashboard-intelligence-application-policy';
import type { DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { FrakonDashboardIntelligenceAppliedDetail } from './dashboard-intelligence-panel';
import './dashboard-intelligence-panel';

@customElement('frakon-dashboard-intelligence-safe-panel')
export class FrakonDashboardIntelligenceSafePanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) context: DashboardIntelligenceContext = { device: 'desktop' };
  @property({ attribute: false }) automaticContext?: DashboardIntelligenceContext;
  @state() private pending?: FrakonDashboardIntelligenceAppliedDetail;
  @state() private criticalConfirmed = false;
  @state() private policyMessage?: string;

  static styles = css`
    :host { display:block; }
    .confirmation {
      display:grid;
      gap:10px;
      margin-top:10px;
      padding:12px;
      border:1px solid rgb(255 185 76 / 45%);
      border-radius:12px;
      background:rgb(255 185 76 / 10%);
      font:500 12px/1.45 Inter,system-ui,sans-serif;
    }
    .critical {
      border-color:rgb(255 91 91 / 58%);
      background:rgb(255 91 91 / 12%);
    }
    .actions { display:flex; gap:8px; flex-wrap:wrap; }
    button {
      border:1px solid rgb(255 255 255 / 15%);
      border-radius:9px;
      padding:8px 11px;
      color:inherit;
      background:rgb(255 255 255 / 7%);
      cursor:pointer;
      font:inherit;
    }
    button.primary { border-color:rgb(95 211 154 / 55%); background:rgb(95 211 154 / 17%); }
    button:disabled { opacity:.42; cursor:not-allowed; }
    label { display:flex; gap:8px; align-items:flex-start; }
  `;

  private onApplied(event: CustomEvent<FrakonDashboardIntelligenceAppliedDetail>): void {
    event.stopPropagation();
    this.pending = structuredClone(event.detail);
    this.criticalConfirmed = false;
    const decision = evaluateDashboardIntelligenceApplication({
      proposal: {
        profile: event.detail.profile,
        label: event.detail.profile,
        explanation: '',
        document: event.detail.document,
        changedItemIds: changedItems(this.document, event.detail.document),
      },
      context: event.detail.context,
      mode: 'preview-only',
    });
    this.policyMessage = decision.reason;
  }

  private confirm(): void {
    if (!this.pending) return;
    const proposal = {
      profile: this.pending.profile,
      label: this.pending.profile,
      explanation: '',
      document: this.pending.document,
      changedItemIds: changedItems(this.document, this.pending.document),
    } as const;
    const decision = evaluateDashboardIntelligenceApplication({
      proposal,
      context: this.pending.context,
      mode: 'user-confirmed',
      criticalConfirmed: this.criticalConfirmed,
    });
    this.policyMessage = decision.reason;
    if (!decision.allowed) return;

    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligenceAppliedDetail>(
      'frakon-dashboard-intelligence-applied',
      {
        detail: structuredClone(this.pending),
        bubbles: true,
        composed: true,
      },
    ));
    this.pending = undefined;
    this.criticalConfirmed = false;
  }

  private cancel(): void {
    this.pending = undefined;
    this.criticalConfirmed = false;
    this.policyMessage = undefined;
  }

  render() {
    const criticalIds = (this.pending?.context.usage ?? [])
      .filter((signal) => signal.urgent && signal.severity === 'critical')
      .map((signal) => signal.itemId);
    const critical = criticalIds.length > 0;

    return html`
      <frakon-dashboard-intelligence-panel
        .document=${this.document}
        .context=${this.context}
        .automaticContext=${this.automaticContext}
        @frakon-dashboard-intelligence-applied=${this.onApplied}
      ></frakon-dashboard-intelligence-panel>
      ${this.pending ? html`
        <section class=${`confirmation ${critical ? 'critical' : ''}`} role="alertdialog" aria-label="Confirm Dashboard Intelligence layout">
          <strong>${critical ? 'Critical signal layout confirmation' : 'Confirm layout change'}</strong>
          <span>The live Intelligence signal changed only the preview. The saved dashboard will remain unchanged until you confirm this action.</span>
          ${critical ? html`
            <span>Critical cards: ${criticalIds.join(', ')}</span>
            <label>
              <input type="checkbox" .checked=${this.criticalConfirmed} @change=${(event: Event) => { this.criticalConfirmed = (event.target as HTMLInputElement).checked; }}>
              I understand that this layout proposal was influenced by an active critical Home Assistant signal.
            </label>
          ` : nothing}
          ${this.policyMessage ? html`<small>${this.policyMessage}</small>` : nothing}
          <div class="actions">
            <button @click=${this.cancel}>Keep current dashboard</button>
            <button class="primary" ?disabled=${critical && !this.criticalConfirmed} @click=${this.confirm}>Apply confirmed layout</button>
          </div>
        </section>
      ` : nothing}
    `;
  }
}

function changedItems(
  current: FrakonDashboardDocument | undefined,
  proposal: FrakonDashboardDocument,
): string[] {
  if (!current) return proposal.items.map((item) => item.id);
  const currentById = new Map(current.items.map((item) => [item.id, item]));
  return proposal.items
    .filter((item) => {
      const before = currentById.get(item.id);
      return !before || before.x !== item.x || before.y !== item.y || before.w !== item.w || before.h !== item.h;
    })
    .map((item) => item.id);
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-intelligence-safe-panel': FrakonDashboardIntelligenceSafePanel;
  }
}
