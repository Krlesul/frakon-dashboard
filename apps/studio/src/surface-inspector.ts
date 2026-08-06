import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SurfaceStyle } from '../../../packages/design-system/src/surface-style';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import {
  applySurfaceStyleToTarget,
  clearItemSurfaceStyle,
  type DashboardSurfaceTarget,
} from '../../../src/dashboard/surface-style-actions';
import { resolveGridItemSurface } from '../../../src/dashboard/surface-style-resolver';
import type { FrakonConstraintDocumentChangedDetail } from './constraint-inspector';
import type { FrakonSurfaceStyleChangedDetail } from './surface-style-editor';
import './constraint-inspector';
import './surface-style-editor';

export interface FrakonStudioDocumentChangedDetail {
  document: FrakonDashboardDocument;
  target: DashboardSurfaceTarget;
  source?: 'surface' | 'constraints';
}

type InspectorMode = 'auto' | 'dashboard' | 'card-defaults';
type InspectorTab = 'appearance' | 'constraints';

@customElement('frakon-surface-inspector')
export class FrakonSurfaceInspector extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @property() mode: InspectorMode = 'auto';
  @state() private activeTab: InspectorTab = 'appearance';

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:12px; }
    .tabs,.targets { display:grid; gap:6px; }
    .tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .targets { grid-template-columns:repeat(3,minmax(0,1fr)); }
    button {
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:10px;
      padding:9px;
      color:inherit;
      background:rgb(255 255 255 / 6%);
      cursor:pointer;
    }
    button[aria-pressed='true'] {
      background:rgb(105 167 255 / 18%);
      border-color:rgb(105 167 255 / 45%);
    }
    .tab {
      font-weight:650;
      letter-spacing:.01em;
    }
    .reset { justify-self:start; }
  `;

  private target(): DashboardSurfaceTarget {
    if (this.mode === 'dashboard') return { kind: 'dashboard' };
    if (this.mode === 'card-defaults') return { kind: 'card-defaults' };
    return this.selection.ids.length > 0
      ? { kind: 'items', ids: [...this.selection.ids] }
      : { kind: 'dashboard' };
  }

  private targetLabel(target: DashboardSurfaceTarget): string {
    if (target.kind === 'dashboard') return 'Dashboard surface';
    if (target.kind === 'card-defaults') return 'Default card surface';
    return target.ids.length === 1 ? 'Selected card surface' : `${target.ids.length} selected cards`;
  }

  private currentStyle(target: DashboardSurfaceTarget): SurfaceStyle {
    if (!this.document) return {};
    if (target.kind === 'dashboard') return this.document.surface ?? {};
    if (target.kind === 'card-defaults') return this.document.cardSurface ?? {};
    const first = this.document.items.find((item) => target.ids.includes(item.id));
    return first ? resolveGridItemSurface(this.document, first) : (this.document.cardSurface ?? {});
  }

  private emitDocument(
    document: FrakonDashboardDocument,
    target: DashboardSurfaceTarget,
    source: 'surface' | 'constraints',
  ): void {
    this.document = document;
    this.dispatchEvent(new CustomEvent<FrakonStudioDocumentChangedDetail>('frakon-studio-document-changed', {
      detail: { document: structuredClone(document), target, source },
      bubbles: true,
      composed: true,
    }));
  }

  private onStyleChanged(event: CustomEvent<FrakonSurfaceStyleChangedDetail>): void {
    if (!this.document) return;
    const target = this.target();
    this.emitDocument(applySurfaceStyleToTarget(this.document, target, event.detail.style), target, 'surface');
  }

  private onConstraintDocumentChanged(event: CustomEvent<FrakonConstraintDocumentChangedDetail>): void {
    this.emitDocument(event.detail.document, this.target(), 'constraints');
  }

  private clearOverrides(): void {
    if (!this.document) return;
    const target = this.target();
    if (target.kind !== 'items') return;
    this.emitDocument(clearItemSurfaceStyle(this.document, target.ids), target, 'surface');
  }

  private renderAppearance() {
    const target = this.target();
    return html`
      <div class="targets" aria-label="Surface target">
        <button aria-pressed=${this.mode === 'auto'} @click=${() => { this.mode = 'auto'; }}>Selection</button>
        <button aria-pressed=${this.mode === 'dashboard'} @click=${() => { this.mode = 'dashboard'; }}>Dashboard</button>
        <button aria-pressed=${this.mode === 'card-defaults'} @click=${() => { this.mode = 'card-defaults'; }}>Card defaults</button>
      </div>
      <frakon-surface-style-editor
        .surfaceStyle=${this.currentStyle(target)}
        .target=${this.targetLabel(target)}
        @frakon-surface-style-changed=${this.onStyleChanged}
      ></frakon-surface-style-editor>
      ${target.kind === 'items' ? html`
        <button class="reset" @click=${this.clearOverrides}>Use inherited card style</button>
      ` : ''}
    `;
  }

  render() {
    return html`
      <section class="shell">
        <div class="tabs" role="tablist" aria-label="Studio inspector">
          <button
            class="tab"
            role="tab"
            aria-selected=${this.activeTab === 'appearance'}
            aria-pressed=${this.activeTab === 'appearance'}
            @click=${() => { this.activeTab = 'appearance'; }}
          >Appearance</button>
          <button
            class="tab"
            role="tab"
            aria-selected=${this.activeTab === 'constraints'}
            aria-pressed=${this.activeTab === 'constraints'}
            @click=${() => { this.activeTab = 'constraints'; }}
          >Layout rules</button>
        </div>

        ${this.activeTab === 'appearance' ? this.renderAppearance() : html`
          <frakon-constraint-inspector
            .document=${this.document}
            .selection=${this.selection}
            @frakon-constraint-document-changed=${this.onConstraintDocumentChanged}
          ></frakon-constraint-inspector>
        `}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-surface-inspector': FrakonSurfaceInspector;
  }
}
