import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  generateDashboardIntelligenceProposals,
  type DashboardIntelligenceProfile,
  type DashboardIntelligenceProposal,
} from '../../../src/dashboard/dashboard-intelligence-proposals';
import type {
  DashboardDaypart,
  DashboardDeviceContext,
  DashboardIntelligenceContext,
  DashboardUsageSignal,
} from '../../../src/dashboard/dashboard-intelligence';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import './constraint-preview-bridge';

export interface FrakonDashboardIntelligencePreviewDetail {
  proposal?: DashboardIntelligenceProposal;
}

export interface FrakonDashboardIntelligenceAppliedDetail {
  document: FrakonDashboardDocument;
  profile: DashboardIntelligenceProfile;
  context: DashboardIntelligenceContext;
}

@customElement('frakon-dashboard-intelligence-panel')
export class FrakonDashboardIntelligencePanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) context: DashboardIntelligenceContext = { device: 'desktop' };
  @property({ attribute: false }) automaticContext?: DashboardIntelligenceContext;
  @state() private selectedProfile?: DashboardIntelligenceProfile;
  @state() private previewVisible = true;
  @state() private automaticSignals = true;
  @state() private device: DashboardDeviceContext = 'desktop';
  @state() private daypart: DashboardDaypart = 'day';
  @state() private usageById: Record<string, DashboardUsageSignal> = {};

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:12px; padding:14px; border:1px solid rgb(105 167 255 / 28%); border-radius:14px; background:rgb(105 167 255 / 7%); font:500 13px/1.45 Inter,system-ui,sans-serif; }
    h3,p { margin:0; }
    p { opacity:.7; }
    .context { display:grid; gap:10px; padding:11px; border-radius:11px; background:rgb(255 255 255 / 5%); }
    .context-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
    .mode { display:flex; gap:6px; }
    .mode button { border:1px solid rgb(255 255 255 / 13%); border-radius:8px; padding:6px 9px; color:inherit; background:rgb(255 255 255 / 6%); cursor:pointer; font:inherit; }
    .mode button.active { border-color:rgb(95 211 154 / 48%); background:rgb(95 211 154 / 15%); }
    .context-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    label { display:grid; gap:5px; font-size:11px; opacity:.84; }
    select,input { width:100%; box-sizing:border-box; border:1px solid rgb(255 255 255 / 13%); border-radius:8px; padding:8px; color:inherit; background:rgb(17 20 28 / 88%); font:inherit; }
    select:disabled,input:disabled { opacity:.58; cursor:not-allowed; }
    .signals { display:grid; gap:7px; max-height:220px; overflow:auto; }
    .signal { display:grid; grid-template-columns:minmax(0,1fr) 92px auto; gap:8px; align-items:center; padding:8px; border-radius:9px; background:rgb(255 255 255 / 4%); }
    .signal strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
    .urgent { display:flex; align-items:center; gap:5px; white-space:nowrap; }
    .urgent input { width:auto; }
    .automatic-note { margin:0; font-size:11px; opacity:.62; }
    .profiles { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .profile { display:grid; gap:5px; min-height:92px; padding:11px; text-align:left; border:1px solid rgb(255 255 255 / 11%); border-radius:11px; color:inherit; background:rgb(255 255 255 / 5%); cursor:pointer; font:inherit; }
    .profile:hover { background:rgb(255 255 255 / 8%); }
    .profile.selected { border-color:rgb(105 167 255 / 62%); background:rgb(105 167 255 / 17%); box-shadow:0 0 0 1px rgb(105 167 255 / 12%) inset; }
    .profile strong { font-size:13px; }
    .profile span { opacity:.7; font-size:11px; line-height:1.4; }
    .profile small { margin-top:auto; opacity:.56; }
    .summary { display:grid; gap:5px; padding:10px; border-radius:10px; background:rgb(255 255 255 / 5%); }
    .actions { display:flex; gap:7px; flex-wrap:wrap; }
    button.action { border:1px solid rgb(255 255 255 / 13%); border-radius:9px; padding:8px 11px; color:inherit; background:rgb(255 255 255 / 7%); cursor:pointer; font:inherit; }
    button.primary { border-color:rgb(95 211 154 / 50%); background:rgb(95 211 154 / 16%); }
    button:disabled { opacity:.42; cursor:not-allowed; }
    @media (max-width:700px) { .profiles,.context-grid { grid-template-columns:1fr; } .signal { grid-template-columns:minmax(0,1fr) 82px; } .urgent { grid-column:1 / -1; } }
  `;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('document')) {
      this.selectedProfile = undefined;
      this.previewVisible = true;
      this.usageById = Object.fromEntries((this.document?.items ?? []).map((item) => [item.id, { itemId: item.id, interactions30d: 0, urgent: false }]));
    }
    if (changed.has('context')) this.applyManualContext(this.context);
    if (changed.has('automaticContext') && this.automaticContext) this.automaticSignals = true;
  }

  private applyManualContext(context: DashboardIntelligenceContext): void {
    this.device = context.device;
    this.daypart = context.daypart ?? 'day';
    this.usageById = Object.fromEntries((context.usage ?? []).map((signal) => [signal.itemId, { ...signal }]));
  }

  private effectiveContext(): DashboardIntelligenceContext {
    if (this.automaticSignals && this.automaticContext) return structuredClone(this.automaticContext);
    return {
      device: this.device,
      daypart: this.daypart,
      now: Date.now(),
      usage: Object.values(this.usageById),
    };
  }

  private effectiveSignal(itemId: string): DashboardUsageSignal {
    const context = this.effectiveContext();
    return context.usage?.find((signal) => signal.itemId === itemId)
      ?? { itemId, interactions30d: 0, urgent: false };
  }

  private setAutomaticSignals(value: boolean): void {
    this.automaticSignals = value && Boolean(this.automaticContext);
    this.refreshPreview();
  }

  private proposals(): DashboardIntelligenceProposal[] {
    return this.document
      ? generateDashboardIntelligenceProposals(this.document, this.effectiveContext())
      : [];
  }

  private selectedProposal(proposals = this.proposals()): DashboardIntelligenceProposal | undefined {
    return proposals.find((proposal) => proposal.profile === this.selectedProfile);
  }

  private refreshPreview(): void {
    if (!this.selectedProfile || !this.previewVisible) return;
    this.dispatchPreview(this.selectedProposal());
  }

  private setInteractions(itemId: string, value: string): void {
    const current = this.usageById[itemId] ?? { itemId };
    this.usageById = {
      ...this.usageById,
      [itemId]: { ...current, interactions30d: Math.max(0, Number.parseInt(value, 10) || 0) },
    };
    this.refreshPreview();
  }

  private setUrgent(itemId: string, urgent: boolean): void {
    const current = this.usageById[itemId] ?? { itemId };
    this.usageById = { ...this.usageById, [itemId]: { ...current, urgent } };
    this.refreshPreview();
  }

  private select(proposal: DashboardIntelligenceProposal): void {
    this.selectedProfile = proposal.profile;
    this.previewVisible = true;
    this.dispatchPreview(proposal);
  }

  private dispatchPreview(proposal?: DashboardIntelligenceProposal): void {
    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligencePreviewDetail>('frakon-dashboard-intelligence-preview-changed', {
      detail: { proposal },
      bubbles: true,
      composed: true,
    }));
  }

  private togglePreview(): void {
    this.previewVisible = !this.previewVisible;
    this.dispatchPreview(this.previewVisible ? this.selectedProposal() : undefined);
  }

  private cancel(): void {
    this.selectedProfile = undefined;
    this.previewVisible = false;
    this.dispatchPreview(undefined);
  }

  private apply(): void {
    const proposal = this.selectedProposal();
    if (!proposal) return;
    this.dispatchEvent(new CustomEvent<FrakonDashboardIntelligenceAppliedDetail>('frakon-dashboard-intelligence-applied', {
      detail: {
        document: structuredClone(proposal.document),
        profile: proposal.profile,
        context: structuredClone(this.effectiveContext()),
      },
      bubbles: true,
      composed: true,
    }));
    this.previewVisible = false;
  }

  render() {
    if (!this.document) return nothing;
    const proposals = this.proposals();
    const selected = this.selectedProposal(proposals);
    const effective = this.effectiveContext();

    return html`
      <section class="panel">
        <div>
          <h3>Dashboard Intelligence</h3>
          <p>Choose a layout profile. The proposal is previewed on the canvas and is not saved until you apply it.</p>
        </div>
        <div class="context">
          <div class="context-head">
            <strong>Intelligence context</strong>
            <div class="mode" aria-label="Intelligence signal mode">
              <button class=${this.automaticSignals ? 'active' : ''} ?disabled=${!this.automaticContext} @click=${() => this.setAutomaticSignals(true)}>Automatic</button>
              <button class=${!this.automaticSignals ? 'active' : ''} @click=${() => this.setAutomaticSignals(false)}>Manual</button>
            </div>
          </div>
          ${this.automaticSignals && this.automaticContext
            ? html`<p class="automatic-note">Using live daypart, interaction history and Home Assistant urgency signals.</p>`
            : html`<p class="automatic-note">Manual values are used only for this proposal preview.</p>`}
          <div class="context-grid">
            <label>Target device
              <select .value=${effective.device} ?disabled=${this.automaticSignals} @change=${(event: Event) => { this.device = (event.target as HTMLSelectElement).value as DashboardDeviceContext; this.refreshPreview(); }}>
                <option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option><option value="wall">Wall display</option>
              </select>
            </label>
            <label>Daypart
              <select .value=${effective.daypart ?? 'day'} ?disabled=${this.automaticSignals} @change=${(event: Event) => { this.daypart = (event.target as HTMLSelectElement).value as DashboardDaypart; this.refreshPreview(); }}>
                <option value="morning">Morning</option><option value="day">Day</option><option value="evening">Evening</option><option value="night">Night</option>
              </select>
            </label>
          </div>
          <div class="signals">
            ${this.document.items.map((item) => {
              const signal = this.effectiveSignal(item.id);
              const label = typeof item.card.name === 'string' ? item.card.name : item.id;
              return html`<div class="signal">
                <strong title=${label}>${label}</strong>
                <label>Uses / 30d<input type="number" min="0" ?disabled=${this.automaticSignals} .value=${String(signal.interactions30d ?? 0)} @input=${(event: Event) => this.setInteractions(item.id, (event.target as HTMLInputElement).value)}></label>
                <label class="urgent"><input type="checkbox" ?disabled=${this.automaticSignals} .checked=${Boolean(signal.urgent)} @change=${(event: Event) => this.setUrgent(item.id, (event.target as HTMLInputElement).checked)}>Urgent</label>
              </div>`;
            })}
          </div>
        </div>
        <div class="profiles">
          ${proposals.map((proposal) => html`
            <button class=${`profile ${proposal.profile === this.selectedProfile ? 'selected' : ''}`} @click=${() => this.select(proposal)}>
              <strong>${proposal.label}</strong>
              <span>${proposal.explanation}</span>
              <small>${proposal.changedItemIds.length} card${proposal.changedItemIds.length === 1 ? '' : 's'} changed</small>
            </button>
          `)}
        </div>
        ${selected ? html`
          <div class="summary">
            <strong>${selected.label} proposal</strong>
            <span>${selected.explanation}</span>
            <small>${selected.changedItemIds.length > 0
              ? `Changes: ${selected.changedItemIds.join(', ')}`
              : 'This dashboard already matches the selected profile.'}</small>
          </div>
        ` : nothing}
        <div class="actions">
          <button class="action" ?disabled=${!selected} @click=${this.togglePreview}>${this.previewVisible ? 'Hide preview' : 'Show preview'}</button>
          <button class="action" ?disabled=${!selected} @click=${this.cancel}>Cancel</button>
          <button class="action primary" ?disabled=${!selected || selected.changedItemIds.length === 0} @click=${this.apply}>Apply proposal</button>
        </div>
      </section>
      <frakon-constraint-preview-bridge
        .source=${this.document}
        .preview=${selected?.document}
        .visible=${Boolean(selected && this.previewVisible)}
      ></frakon-constraint-preview-bridge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-intelligence-panel': FrakonDashboardIntelligencePanel;
  }
}
