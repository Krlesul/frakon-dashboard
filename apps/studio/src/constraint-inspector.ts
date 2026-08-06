import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  ConstraintDiagnostic,
  ConstraintKind,
  LayoutConstraint,
} from '../../../packages/studio-engine/src/constraints';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import {
  addConstraint,
  removeConstraint,
  setConstraintEnabled,
  setConstraintPriority,
  updateConstraint,
} from '../../../src/dashboard/constraint-actions';
import { solveDashboardConstraints } from '../../../src/dashboard/constraint-solver';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

export interface FrakonConstraintDocumentChangedDetail {
  document: FrakonDashboardDocument;
  constraintId?: string;
}

const CONSTRAINT_KINDS: Array<{ value: ConstraintKind; label: string }> = [
  { value: 'align-left', label: 'Align left' },
  { value: 'align-center-x', label: 'Align horizontal centers' },
  { value: 'align-right', label: 'Align right' },
  { value: 'align-top', label: 'Align top' },
  { value: 'align-center-y', label: 'Align vertical centers' },
  { value: 'align-bottom', label: 'Align bottom' },
  { value: 'below', label: 'Place below' },
  { value: 'right-of', label: 'Place right of' },
  { value: 'match-width', label: 'Match width' },
  { value: 'match-height', label: 'Match height' },
];

@customElement('frakon-constraint-inspector')
export class FrakonConstraintInspector extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };

  @state() private sourceId = '';
  @state() private targetId = '';
  @state() private kind: ConstraintKind = 'below';
  @state() private gap = 1;
  @state() private priority = 50;
  @state() private previewEnabled = true;

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:14px; padding:14px; border:1px solid rgb(255 255 255 / 10%); border-radius:16px; background:rgb(255 255 255 / 4%); }
    h3,h4,p { margin:0; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    label { display:grid; gap:6px; font-size:12px; opacity:.86; }
    select,input,button { font:inherit; color:inherit; }
    select,input { box-sizing:border-box; width:100%; padding:9px 10px; border:1px solid rgb(255 255 255 / 12%); border-radius:10px; background:rgb(13 18 28 / 78%); }
    button { border:1px solid rgb(105 167 255 / 36%); border-radius:10px; padding:9px 12px; background:rgb(105 167 255 / 15%); cursor:pointer; }
    button.primary { background:rgb(105 167 255 / 25%); border-color:rgb(105 167 255 / 56%); font-weight:700; }
    button.danger { border-color:rgb(255 92 114 / 35%); background:rgb(255 92 114 / 12%); }
    button:disabled { opacity:.45; cursor:not-allowed; }
    .constraint-list,.preview,.diagnostics { display:grid; gap:8px; }
    .constraint { display:grid; gap:8px; padding:10px; border:1px solid rgb(255 255 255 / 9%); border-radius:12px; background:rgb(255 255 255 / 3%); }
    .row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .meta { font-size:12px; opacity:.65; }
    .actions { display:flex; flex-wrap:wrap; gap:6px; }
    .empty { opacity:.62; font-size:13px; }
    .preview { padding:12px; border:1px solid rgb(105 167 255 / 20%); border-radius:14px; background:rgb(105 167 255 / 7%); }
    .preview-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
    .metric { display:grid; gap:3px; padding:9px; border-radius:10px; background:rgb(255 255 255 / 4%); }
    .metric strong { font-size:16px; }
    .diagnostic { padding:8px 10px; border-radius:10px; font-size:12px; background:rgb(255 255 255 / 4%); }
    .diagnostic.applied { border-left:3px solid #5fd39a; }
    .diagnostic.locked { border-left:3px solid #ffcf66; }
    .diagnostic.missing-item { border-left:3px solid #ff5c72; }
    .diagnostic.skipped { border-left:3px solid #9aa7bd; }
    @media (max-width:560px) {
      .grid,.preview-summary { grid-template-columns:1fr; }
    }
  `;

  protected updated(): void {
    const items = this.document?.items ?? [];
    const selected = this.selection.ids.find((id) => items.some((item) => item.id === id));
    if (!this.sourceId || !items.some((item) => item.id === this.sourceId)) {
      this.sourceId = selected ?? items[0]?.id ?? '';
    }
    if (!this.targetId || !items.some((item) => item.id === this.targetId) || this.targetId === this.sourceId) {
      this.targetId = items.find((item) => item.id !== this.sourceId)?.id ?? '';
    }
  }

  private emitDocument(document: FrakonDashboardDocument, constraintId?: string): void {
    this.document = document;
    this.dispatchEvent(new CustomEvent<FrakonConstraintDocumentChangedDetail>('frakon-constraint-document-changed', {
      detail: { document: structuredClone(document), constraintId },
      bubbles: true,
      composed: true,
    }));
  }

  private createConstraint(): void {
    if (!this.document || !this.sourceId || !this.targetId || this.sourceId === this.targetId) return;
    const id = `constraint-${this.sourceId}-${this.targetId}-${Date.now()}`;
    const constraint: LayoutConstraint = {
      id,
      kind: this.kind,
      sourceId: this.sourceId,
      targetId: this.targetId,
      gap: this.gap,
      priority: this.priority,
      enabled: true,
    };
    this.emitDocument(addConstraint(this.document, constraint), id);
  }

  private patchConstraint(id: string, patch: Partial<LayoutConstraint>): void {
    if (!this.document) return;
    this.emitDocument(updateConstraint(this.document, id, patch), id);
  }

  private toggleConstraint(constraint: LayoutConstraint): void {
    if (!this.document) return;
    this.emitDocument(setConstraintEnabled(this.document, constraint.id, constraint.enabled === false), constraint.id);
  }

  private changePriority(constraint: LayoutConstraint, delta: number): void {
    if (!this.document) return;
    this.emitDocument(setConstraintPriority(this.document, constraint.id, (constraint.priority ?? 0) + delta), constraint.id);
  }

  private deleteConstraint(id: string): void {
    if (!this.document) return;
    this.emitDocument(removeConstraint(this.document, id), id);
  }

  private applyLayoutRules(): void {
    if (!this.document) return;
    const solved = solveDashboardConstraints(this.document);
    this.emitDocument(solved.document);
  }

  private itemLabel(id: string): string {
    const item = this.document?.items.find((entry) => entry.id === id);
    const name = item && typeof item.card.name === 'string' ? item.card.name : undefined;
    return name ?? id;
  }

  private changedItemCount(document: FrakonDashboardDocument, solved: FrakonDashboardDocument): number {
    const solvedById = new Map(solved.items.map((item) => [item.id, item]));
    return document.items.filter((item) => {
      const next = solvedById.get(item.id);
      return next && (next.x !== item.x || next.y !== item.y || next.w !== item.w || next.h !== item.h);
    }).length;
  }

  private renderDiagnostic(diagnostic: ConstraintDiagnostic) {
    return html`<div class=${`diagnostic ${diagnostic.status}`}><strong>${diagnostic.status}</strong> · ${diagnostic.message}</div>`;
  }

  private renderConstraint(constraint: LayoutConstraint) {
    return html`
      <article class="constraint">
        <div class="row">
          <strong>${this.itemLabel(constraint.sourceId)} → ${this.itemLabel(constraint.targetId)}</strong>
          <button @click=${() => this.toggleConstraint(constraint)}>${constraint.enabled === false ? 'Enable' : 'Disable'}</button>
        </div>
        <div class="meta">${constraint.kind} · gap ${constraint.gap ?? 0} · priority ${constraint.priority ?? 0}</div>
        <div class="grid">
          <label>Type
            <select .value=${constraint.kind} @change=${(event: Event) => this.patchConstraint(constraint.id, { kind: (event.target as HTMLSelectElement).value as ConstraintKind })}>
              ${CONSTRAINT_KINDS.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
            </select>
          </label>
          <label>Gap
            <input type="number" .value=${String(constraint.gap ?? 0)} @change=${(event: Event) => this.patchConstraint(constraint.id, { gap: Number((event.target as HTMLInputElement).value) })}>
          </label>
        </div>
        <div class="actions">
          <button @click=${() => this.changePriority(constraint, -10)}>Priority −10</button>
          <button @click=${() => this.changePriority(constraint, 10)}>Priority +10</button>
          <button class="danger" @click=${() => this.deleteConstraint(constraint.id)}>Delete</button>
        </div>
      </article>
    `;
  }

  render() {
    const document = this.document;
    if (!document) return html`<p>No dashboard document loaded.</p>`;
    const items = document.items;
    const canCreate = items.length > 1 && this.sourceId !== this.targetId;
    const constraints = document.constraints ?? [];
    const solved = solveDashboardConstraints(document);
    const changedItems = this.changedItemCount(document, solved.document);
    const applied = solved.diagnostics.filter((entry) => entry.status === 'applied').length;
    const warnings = solved.diagnostics.filter((entry) => entry.status !== 'applied').length;

    return html`
      <section class="shell">
        <div>
          <h3>Layout constraints</h3>
          <p class="meta">Create persistent relationships between dashboard cards.</p>
        </div>

        ${items.length > 1 ? html`
          <div class="grid">
            <label>Source card
              <select .value=${this.sourceId} @change=${(event: Event) => { this.sourceId = (event.target as HTMLSelectElement).value; }}>
                ${items.map((item) => html`<option value=${item.id}>${this.itemLabel(item.id)}</option>`)}
              </select>
            </label>
            <label>Target card
              <select .value=${this.targetId} @change=${(event: Event) => { this.targetId = (event.target as HTMLSelectElement).value; }}>
                ${items.filter((item) => item.id !== this.sourceId).map((item) => html`<option value=${item.id}>${this.itemLabel(item.id)}</option>`)}
              </select>
            </label>
            <label>Relationship
              <select .value=${this.kind} @change=${(event: Event) => { this.kind = (event.target as HTMLSelectElement).value as ConstraintKind; }}>
                ${CONSTRAINT_KINDS.map((option) => html`<option value=${option.value}>${option.label}</option>`)}
              </select>
            </label>
            <label>Gap
              <input type="number" .value=${String(this.gap)} @input=${(event: Event) => { this.gap = Number((event.target as HTMLInputElement).value); }}>
            </label>
            <label>Priority
              <input type="number" min="-1000" max="1000" .value=${String(this.priority)} @input=${(event: Event) => { this.priority = Number((event.target as HTMLInputElement).value); }}>
            </label>
          </div>
          <button ?disabled=${!canCreate} @click=${this.createConstraint}>Add constraint</button>
        ` : html`<p class="empty">Add at least two cards to create a relationship.</p>`}

        <div class="constraint-list">
          <h4>Existing constraints</h4>
          ${constraints.length > 0 ? constraints.map((constraint) => this.renderConstraint(constraint)) : nothing}
          ${constraints.length === 0 ? html`<p class="empty">No constraints configured.</p>` : nothing}
        </div>

        <section class="preview">
          <div class="row">
            <div>
              <h4>Layout preview</h4>
              <p class="meta">Inspect the result before applying positions and sizes.</p>
            </div>
            <button aria-pressed=${this.previewEnabled} @click=${() => { this.previewEnabled = !this.previewEnabled; }}>
              ${this.previewEnabled ? 'Hide details' : 'Show details'}
            </button>
          </div>
          <div class="preview-summary">
            <div class="metric"><strong>${changedItems}</strong><span class="meta">cards changed</span></div>
            <div class="metric"><strong>${applied}</strong><span class="meta">rules applied</span></div>
            <div class="metric"><strong>${warnings}</strong><span class="meta">warnings</span></div>
          </div>
          ${this.previewEnabled ? html`
            <div class="diagnostics">
              ${solved.diagnostics.length > 0 ? solved.diagnostics.map((entry) => this.renderDiagnostic(entry)) : html`<p class="empty">No active rules to preview.</p>`}
            </div>
          ` : nothing}
          <button class="primary" ?disabled=${constraints.length === 0 || changedItems === 0} @click=${this.applyLayoutRules}>
            Apply layout rules
          </button>
        </section>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-constraint-inspector': FrakonConstraintInspector;
  }
}
