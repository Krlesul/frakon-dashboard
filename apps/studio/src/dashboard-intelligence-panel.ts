import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  generateDashboardIntelligenceProposals,
  type DashboardIntelligenceProfile,
  type DashboardIntelligenceProposal,
} from '../../../src/dashboard/dashboard-intelligence-proposals';
import type { DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import './constraint-preview-bridge';

export interface FrakonDashboardIntelligencePreviewDetail {
  proposal?: DashboardIntelligenceProposal;
}

export interface FrakonDashboardIntelligenceAppliedDetail {
  document: FrakonDashboardDocument;
  profile: DashboardIntelligenceProfile;
}

@customElement('frakon-dashboard-intelligence-panel')
export class FrakonDashboardIntelligencePanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) context: DashboardIntelligenceContext = { device: 'desktop' };
  @state() private selectedProfile?: DashboardIntelligenceProfile;
  @state() private previewVisible = true;

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:12px; padding:14px; border:1px solid rgb(105 167 255 / 28%); border-radius:14px; background:rgb(105 167 255 / 7%); font:500 13px/1.45 Inter,system-ui,sans-serif; }
    h3,p { margin:0; }
    p { opacity:.7; }
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
    @media (max-width:700px) { .profiles { grid-template-columns:1fr; } }
  `;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('document')) {
      this.selectedProfile = undefined;
      this.previewVisible = true;
    }
  }

  private proposals(): DashboardIntelligenceProposal[] {
    return this.document
      ? generateDashboardIntelligenceProposals(this.document, this.context)
      : [];
  }

  private selectedProposal(proposals = this.proposals()): DashboardIntelligenceProposal | undefined {
    return proposals.find((proposal) => proposal.profile === this.selectedProfile);
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

    return html`
      <section class="panel">
        <div>
          <h3>Dashboard Intelligence</h3>
          <p>Choose a layout profile. The proposal is previewed on the canvas and is not saved until you apply it.</p>
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
