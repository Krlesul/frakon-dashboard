import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardMergeResult } from '../../../src/dashboard/dashboard-conflict-resolver';
import { createDashboardConflictPreview } from '../../../src/dashboard/dashboard-conflict-preview';
import { presentDashboardConflict } from '../../../src/dashboard/dashboard-conflict-presentation';
import type { DashboardConflictSession } from '../../../src/dashboard/dashboard-conflict-coordinator';
import type {
  DashboardConflictSelections,
  DashboardConflictSide,
} from '../../../src/dashboard/dashboard-selective-conflict-resolution';
import type { DashboardRevisionEnvelope } from '../../../src/dashboard/dashboard-revision';
import './dashboard-conflict-canvas-bridge';

export interface FrakonDetailedConflictResolvedDetail {
  selections: DashboardConflictSelections;
}

export interface FrakonDetailedConflictPreviewChangedDetail {
  selections: DashboardConflictSelections;
}

@customElement('frakon-dashboard-detailed-conflict-panel')
export class FrakonDashboardDetailedConflictPanel extends LitElement {
  @property({ attribute: false }) local?: DashboardRevisionEnvelope;
  @property({ attribute: false }) remote?: DashboardRevisionEnvelope;
  @property({ attribute: false }) merge?: DashboardMergeResult;
  @state() private selections: DashboardConflictSelections = {};

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:12px; padding:14px; border:1px solid rgb(255 189 92 / 38%); border-radius:14px; background:rgb(255 189 92 / 8%); font:500 13px/1.45 Inter,system-ui,sans-serif; }
    h3,p { margin:0; }
    p { opacity:.72; }
    .list { display:grid; gap:8px; max-height:420px; overflow:auto; }
    .row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; padding:10px; border-radius:10px; background:rgb(255 255 255 / 5%); }
    code { display:block; font:600 12px/1.4 ui-monospace,SFMono-Regular,monospace; }
    small { display:block; margin-top:3px; opacity:.58; }
    .values { display:grid; gap:3px; margin-top:7px; font-size:11px; }
    .values span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .local-value { color:#9ec8ff; }
    .remote-value { color:#ffc27a; }
    .choices,.actions { display:flex; gap:6px; flex-wrap:wrap; }
    button { border:1px solid rgb(255 255 255 / 14%); border-radius:9px; padding:7px 10px; color:inherit; background:rgb(255 255 255 / 7%); cursor:pointer; font:inherit; }
    button.selected { border-color:rgb(105 167 255 / 55%); background:rgb(105 167 255 / 20%); }
    button.primary { border-color:rgb(95 211 154 / 50%); background:rgb(95 211 154 / 16%); }
    button:disabled { opacity:.42; cursor:not-allowed; }
  `;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('merge')) this.selections = {};
  }

  private select(path: string, side: DashboardConflictSide): void {
    this.selections = { ...this.selections, [path]: side };
    this.dispatchEvent(new CustomEvent<FrakonDetailedConflictPreviewChangedDetail>(
      'frakon-dashboard-detailed-conflict-preview-changed',
      {
        detail: { selections: { ...this.selections } },
        bubbles: true,
        composed: true,
      },
    ));
  }

  private apply(): void {
    if (!this.merge || this.merge.conflicts.some((conflict) => !this.selections[conflict.path])) return;
    this.dispatchEvent(new CustomEvent<FrakonDetailedConflictResolvedDetail>('frakon-dashboard-detailed-conflict-resolved', {
      detail: { selections: { ...this.selections } },
      bubbles: true,
      composed: true,
    }));
  }

  private conflictSession(): DashboardConflictSession | undefined {
    if (!this.local || !this.remote || !this.merge) return undefined;
    return {
      comparison: {
        relation: 'conflict',
        local: this.local,
        remote: this.remote,
      },
      base: this.local,
      merge: this.merge,
    };
  }

  render() {
    const session = this.conflictSession();
    if (!this.local || !this.remote || !this.merge || !session || this.merge.conflicts.length === 0) return nothing;
    const resolved = this.merge.conflicts.filter((conflict) => this.selections[conflict.path]).length;
    const preview = createDashboardConflictPreview(session, this.selections);

    return html`
      <section class="panel" role="alert">
        <div>
          <h3>Resolve dashboard changes individually</h3>
          <p>${resolved} of ${this.merge.conflicts.length} conflicts resolved. Card choices are previewed live on the canvas.</p>
        </div>
        <div class="list">
          ${this.merge.conflicts.map((conflict) => {
            const presentation = presentDashboardConflict(conflict);
            return html`
              <div class="row">
                <div>
                  <code>${presentation.label}</code>
                  <small>${conflict.path}</small>
                  <div class="values">
                    <span class="local-value">Local: ${presentation.local}</span>
                    <span class="remote-value">Home Assistant: ${presentation.remote}</span>
                  </div>
                </div>
                <div class="choices">
                  <button class=${this.selections[conflict.path] === 'local' ? 'selected' : ''} @click=${() => this.select(conflict.path, 'local')}>Local</button>
                  <button class=${this.selections[conflict.path] === 'remote' ? 'selected' : ''} @click=${() => this.select(conflict.path, 'remote')}>Home Assistant</button>
                </div>
              </div>
            `;
          })}
        </div>
        <div class="actions">
          <button class="primary" ?disabled=${resolved !== this.merge.conflicts.length} @click=${this.apply}>Apply selected resolutions</button>
        </div>
      </section>
      <frakon-dashboard-conflict-canvas-bridge
        .preview=${preview}
        .document=${this.local.document}
        .visible=${true}
      ></frakon-dashboard-conflict-canvas-bridge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-detailed-conflict-panel': FrakonDashboardDetailedConflictPanel;
  }
}
