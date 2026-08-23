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
  @state() private showLocal = true;
  @state() private showRemote = true;
  @state() private showResult = true;
  @state() private activePath = '';
  @state() private focusToken = 0;

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:12px; padding:14px; border:1px solid rgb(255 189 92 / 38%); border-radius:14px; background:rgb(255 189 92 / 8%); font:500 13px/1.45 Inter,system-ui,sans-serif; }
    h3,p { margin:0; }
    p { opacity:.72; }
    .toolbar,.legend { display:flex; flex-wrap:wrap; gap:7px; align-items:center; }
    .toolbar output { margin-right:auto; opacity:.72; font-variant-numeric:tabular-nums; }
    .legend strong { margin-right:2px; font-size:12px; }
    .legend button { display:inline-flex; align-items:center; gap:6px; }
    .swatch { width:10px; height:10px; border-radius:3px; box-sizing:border-box; }
    .swatch.local { border:2px solid #69a7ff; background:rgb(105 167 255 / 14%); }
    .swatch.remote { border:2px dashed #ffae5c; background:rgb(255 174 92 / 12%); }
    .swatch.result { border:2px solid #5fd39a; background:rgb(95 211 154 / 15%); }
    .list { display:grid; gap:8px; max-height:420px; overflow:auto; }
    .row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; padding:10px; border-radius:10px; background:rgb(255 255 255 / 5%); }
    .row.active { box-shadow:0 0 0 1px rgb(105 167 255 / 48%) inset; background:rgb(105 167 255 / 9%); }
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
    button.layer-off { opacity:.48; }
    button:disabled { opacity:.42; cursor:not-allowed; }
  `;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('merge')) {
      this.selections = {};
      this.activePath = this.merge?.conflicts[0]?.path ?? '';
      this.focusToken += this.cardId(this.activePath) ? 1 : 0;
    }
  }

  private select(path: string, side: DashboardConflictSide): void {
    this.activePath = path;
    this.selections = { ...this.selections, [path]: side };
    this.dispatchEvent(new CustomEvent<FrakonDetailedConflictPreviewChangedDetail>(
      'frakon-dashboard-detailed-conflict-preview-changed',
      { detail: { selections: { ...this.selections } }, bubbles: true, composed: true },
    ));
    this.focusActiveCard();
  }

  private focusConflict(path: string): void {
    this.activePath = path;
    this.focusActiveCard();
  }

  private focusActiveCard(): void {
    if (this.cardId(this.activePath)) this.focusToken += 1;
  }

  private navigate(direction: -1 | 1): void {
    const conflicts = this.merge?.conflicts ?? [];
    if (conflicts.length === 0) return;
    const current = Math.max(0, conflicts.findIndex((conflict) => conflict.path === this.activePath));
    const next = (current + direction + conflicts.length) % conflicts.length;
    this.activePath = conflicts[next]?.path ?? '';
    this.focusActiveCard();
  }

  private nextUnresolved(): void {
    const conflicts = this.merge?.conflicts ?? [];
    const unresolved = conflicts.filter((conflict) => !this.selections[conflict.path]);
    if (unresolved.length === 0) return;
    const current = unresolved.findIndex((conflict) => conflict.path === this.activePath);
    const next = unresolved[(current + 1 + unresolved.length) % unresolved.length];
    this.activePath = next?.path ?? '';
    this.focusActiveCard();
  }

  private cardId(path: string): string {
    return /^items\.(.+)$/.exec(path)?.[1] ?? '';
  }

  private apply(): void {
    if (!this.merge || this.merge.conflicts.some((conflict) => !this.selections[conflict.path])) return;
    this.dispatchEvent(new CustomEvent<FrakonDetailedConflictResolvedDetail>('frakon-dashboard-detailed-conflict-resolved', {
      detail: { selections: { ...this.selections } }, bubbles: true, composed: true,
    }));
  }

  private conflictSession(): DashboardConflictSession | undefined {
    if (!this.local || !this.remote || !this.merge) return undefined;
    return { comparison: { relation: 'conflict', local: this.local, remote: this.remote }, base: this.local, merge: this.merge };
  }

  render() {
    const session = this.conflictSession();
    if (!this.local || !this.remote || !this.merge || !session || this.merge.conflicts.length === 0) return nothing;
    const resolved = this.merge.conflicts.filter((conflict) => this.selections[conflict.path]).length;
    const preview = createDashboardConflictPreview(session, this.selections);
    const activeId = this.cardId(this.activePath);
    const activeIndex = Math.max(0, this.merge.conflicts.findIndex((conflict) => conflict.path === this.activePath));
    const unresolved = this.merge.conflicts.length - resolved;

    return html`
      <section class="panel" role="alert">
        <div><h3>Resolve dashboard changes individually</h3><p>${resolved} of ${this.merge.conflicts.length} conflicts resolved. Card choices are previewed live on the canvas.</p></div>
        <div class="toolbar" aria-label="Conflict navigation"><output>Conflict ${activeIndex + 1} of ${this.merge.conflicts.length} · ${unresolved} unresolved</output><button @click=${() => this.navigate(-1)}>Previous</button><button @click=${() => this.navigate(1)}>Next</button><button ?disabled=${unresolved === 0} @click=${this.nextUnresolved}>Next unresolved</button></div>
        <div class="legend" aria-label="Conflict preview layers"><strong>Canvas layers</strong><button class=${this.showLocal ? '' : 'layer-off'} @click=${() => { this.showLocal = !this.showLocal; }}><span class="swatch local"></span>Local</button><button class=${this.showRemote ? '' : 'layer-off'} @click=${() => { this.showRemote = !this.showRemote; }}><span class="swatch remote"></span>Home Assistant</button><button class=${this.showResult ? '' : 'layer-off'} @click=${() => { this.showResult = !this.showResult; }}><span class="swatch result"></span>Result</button></div>
        <div class="list">
          ${this.merge.conflicts.map((conflict) => {
            const presentation = presentDashboardConflict(conflict);
            const cardId = this.cardId(conflict.path);
            return html`<div class=${`row ${this.activePath === conflict.path ? 'active' : ''}`}><div><code>${presentation.label}</code><small>${conflict.path}</small><div class="values"><span class="local-value">Local: ${presentation.localSummary}</span><span class="remote-value">Home Assistant: ${presentation.remoteSummary}</span></div></div><div class="choices">${cardId ? html`<button @click=${() => this.focusConflict(conflict.path)}>Focus card</button>` : nothing}<button class=${this.selections[conflict.path] === 'local' ? 'selected' : ''} @click=${() => this.select(conflict.path, 'local')}>Local</button><button class=${this.selections[conflict.path] === 'remote' ? 'selected' : ''} @click=${() => this.select(conflict.path, 'remote')}>Home Assistant</button></div></div>`;
          })}
        </div>
        <div class="actions"><button class="primary" ?disabled=${resolved !== this.merge.conflicts.length} @click=${this.apply}>Apply selected resolutions</button></div>
      </section>
      <frakon-dashboard-conflict-canvas-bridge .preview=${preview} .document=${this.local.document} .visible=${true} .showLocal=${this.showLocal} .showRemote=${this.showRemote} .showResult=${this.showResult} .activeId=${activeId} .focusToken=${this.focusToken}></frakon-dashboard-conflict-canvas-bridge>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-detailed-conflict-panel': FrakonDashboardDetailedConflictPanel; } }
