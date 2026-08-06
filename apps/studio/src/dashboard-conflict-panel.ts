import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardMergeResult } from '../../../src/dashboard/dashboard-conflict-resolver';
import type { DashboardRevisionEnvelope } from '../../../src/dashboard/dashboard-revision';

export type DashboardConflictChoice = 'local' | 'remote' | 'merged';

export interface FrakonDashboardConflictResolvedDetail {
  choice: DashboardConflictChoice;
}

@customElement('frakon-dashboard-conflict-panel')
export class FrakonDashboardConflictPanel extends LitElement {
  @property({ attribute: false }) local?: DashboardRevisionEnvelope;
  @property({ attribute: false }) remote?: DashboardRevisionEnvelope;
  @property({ attribute: false }) merge?: DashboardMergeResult;

  static styles = css`
    :host { display:block; }
    .panel {
      display:grid;
      gap:12px;
      padding:14px;
      border:1px solid rgb(255 189 92 / 38%);
      border-radius:14px;
      background:rgb(255 189 92 / 8%);
      color:inherit;
      font:500 13px/1.45 Inter,system-ui,sans-serif;
    }
    h3 { margin:0; font-size:15px; }
    p { margin:0; opacity:.78; }
    ul { margin:0; padding-left:20px; max-height:160px; overflow:auto; }
    code { font:600 12px/1.4 ui-monospace,SFMono-Regular,monospace; }
    .versions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .version { padding:9px; border-radius:10px; background:rgb(255 255 255 / 5%); }
    .version strong,.version span { display:block; }
    .version span { margin-top:3px; opacity:.64; font-size:11px; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; }
    button {
      border:1px solid rgb(255 255 255 / 14%);
      border-radius:10px;
      padding:8px 11px;
      color:inherit;
      background:rgb(255 255 255 / 7%);
      cursor:pointer;
      font:inherit;
    }
    button.primary { border-color:rgb(105 167 255 / 45%); background:rgb(105 167 255 / 18%); }
    button:disabled { opacity:.42; cursor:not-allowed; }
  `;

  private resolve(choice: DashboardConflictChoice): void {
    this.dispatchEvent(new CustomEvent<FrakonDashboardConflictResolvedDetail>('frakon-dashboard-conflict-resolved', {
      detail: { choice },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.local || !this.remote || !this.merge) return nothing;
    return html`
      <section class="panel" role="alert">
        <div>
          <h3>Dashboard changed on another device</h3>
          <p>${this.merge.clean
            ? 'The independent changes can be merged automatically.'
            : `${this.merge.conflicts.length} conflicting change${this.merge.conflicts.length === 1 ? '' : 's'} require a decision.`}</p>
        </div>
        <div class="versions">
          <div class="version">
            <strong>Local version</strong>
            <span>${this.local.clientId} · ${new Date(this.local.updatedAt).toLocaleString()}</span>
          </div>
          <div class="version">
            <strong>Home Assistant version</strong>
            <span>${this.remote.clientId} · ${new Date(this.remote.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        ${this.merge.conflicts.length > 0 ? html`
          <ul>
            ${this.merge.conflicts.map((conflict) => html`<li><code>${conflict.path}</code></li>`)}
          </ul>
        ` : nothing}
        <div class="actions">
          <button class="primary" @click=${() => this.resolve('local')}>Keep local</button>
          <button @click=${() => this.resolve('remote')}>Use Home Assistant version</button>
          <button ?disabled=${!this.merge.clean} @click=${() => this.resolve('merged')}>Use automatic merge</button>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-conflict-panel': FrakonDashboardConflictPanel;
  }
}
