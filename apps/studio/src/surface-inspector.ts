import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SurfaceStyle } from '../../../packages/design-system/src/surface-style';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import { solveDashboardConstraints } from '../../../src/dashboard/constraint-solver';
import type { DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import {
  applySurfaceStyleToTarget,
  clearItemSurfaceStyle,
  type DashboardSurfaceTarget,
} from '../../../src/dashboard/surface-style-actions';
import { resolveGridItemSurface } from '../../../src/dashboard/surface-style-resolver';
import type { FrakonConstraintDocumentChangedDetail } from './constraint-inspector';
import type { FrakonDashboardIntelligenceAppliedDetail } from './dashboard-intelligence-panel';
import type { FrakonSurfaceStyleChangedDetail } from './surface-style-editor';
import './constraint-inspector';
import './constraint-preview-bridge';
import './dashboard-intelligence-panel';
import './surface-style-editor';

export interface FrakonStudioDocumentChangedDetail {
  document: FrakonDashboardDocument;
  target: DashboardSurfaceTarget;
  source?: 'surface' | 'constraints' | 'intelligence';
}

type InspectorMode = 'auto' | 'dashboard' | 'card-defaults';
type InspectorTab = 'appearance' | 'constraints' | 'intelligence';

@customElement('frakon-surface-inspector')
export class FrakonSurfaceInspector extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @property({ attribute: false }) intelligenceContext: DashboardIntelligenceContext = { device: 'desktop' };
  @property() mode: InspectorMode = 'auto';
  @state() private activeTab: InspectorTab = 'appearance';
  @state() private canvasPreviewVisible = true;

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:12px; }
    .tabs,.targets { display:grid; gap:6px; }
    .tabs { grid-template-columns:repeat(3,minmax(0,1fr)); }
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
    button.primary {
      background:rgb(105 167 255 / 24%);
      border-color:rgb(105 167 255 / 58%);
      font-weight:700;
    }
    button:disabled { opacity:.45; cursor:not-allowed; }
    .tab {
      min-width:0;
      font-weight:650;
      letter-spacing:.01em;
    }
    .preview-toggle {
      display:grid;
      gap:10px;
      padding:11px 12px;
      border:1px solid rgb(105 167 255 / 18%);
      border-radius:12px;
      background:rgb(105 167 255 / 7%);
    }
    .preview-head,.preview-actions {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
    }
    .preview-toggle span { font-size:12px; opacity:.72; }
    .preview-count { font-weight:700; opacity:1 !important; }
    .preview-actions { justify-content:flex-start; }
    .reset { justify-self:start; }
    @media (max-width:640px) { .tabs { grid-template-columns:1fr; } }
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
    source: 'surface' | 'constraints' | 'intelligence',
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

  private onIntelligenceApplied(event: CustomEvent<FrakonDashboardIntelligenceAppliedDetail>): void {
    this.emitDocument(event.detail.document, { kind: 'dashboard' }, 'intelligence');
  }

  private applyConstraintPreview(preview?: FrakonDashboardDocument): void {
    if (!preview) return;
    this.emitDocument(preview, this.target(), 'constraints');
    this.canvasPreviewVisible = false;
  }

  private clearOverrides(): void {
    if (!this.document) return;
    const target = this.target();
    if (target.kind !== 'items') return;
    this.emitDocument(clearItemSurfaceStyle(this.document, target.ids), target, 'surface');
  }

  private changedItemCount(source?: FrakonDashboardDocument, preview?: FrakonDashboardDocument): number {
    if (!source || !preview) return 0;
    const previewById = new Map(preview.items.map((item) => [item.id, item]));
    return source.items.filter((item) => {
      const next = previewById.get(item.id);
      return next && (next.x !== item.x || next.y !== item.y || next.w !== item.w || next.h !== item.h);
    }).length;
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

  private renderConstraints() {
    const preview = this.document ? solveDashboardConstraints(this.document).document : undefined;
    const changedItems = this.changedItemCount(this.document, preview);
    return html`
      <div class="preview-toggle">
        <div class="preview-head">
          <div>
            <strong>Canvas preview</strong><br>
            <span>Proposed positions are shown without modifying the dashboard.</span>
          </div>
          <span class="preview-count">${changedItems} changed</span>
        </div>
        <div class="preview-actions">
          <button
            aria-pressed=${this.canvasPreviewVisible}
            @click=${() => { this.canvasPreviewVisible = !this.canvasPreviewVisible; }}
          >${this.canvasPreviewVisible ? 'Hide preview' : 'Show preview'}</button>
          <button
            class="primary"
            ?disabled=${changedItems === 0}
            @click=${() => this.applyConstraintPreview(preview)}
          >Apply preview</button>
          <button
            ?disabled=${!this.canvasPreviewVisible}
            @click=${() => { this.canvasPreviewVisible = false; }}
          >Cancel preview</button>
        </div>
      </div>
      <frakon-constraint-preview-bridge
        .source=${this.document}
        .preview=${preview}
        .visible=${this.canvasPreviewVisible && this.activeTab === 'constraints' && changedItems > 0}
      ></frakon-constraint-preview-bridge>
      <frakon-constraint-inspector
        .document=${this.document}
        .selection=${this.selection}
        @frakon-constraint-document-changed=${this.onConstraintDocumentChanged}
      ></frakon-constraint-inspector>
    `;
  }

  private renderIntelligence() {
    return html`
      <frakon-dashboard-intelligence-panel
        .document=${this.document}
        .context=${this.intelligenceContext}
        @frakon-dashboard-intelligence-applied=${this.onIntelligenceApplied}
      ></frakon-dashboard-intelligence-panel>
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
          <button
            class="tab"
            role="tab"
            aria-selected=${this.activeTab === 'intelligence'}
            aria-pressed=${this.activeTab === 'intelligence'}
            @click=${() => { this.activeTab = 'intelligence'; }}
          >Intelligence</button>
        </div>

        ${this.activeTab === 'appearance'
          ? this.renderAppearance()
          : this.activeTab === 'constraints'
            ? this.renderConstraints()
            : this.renderIntelligence()}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-surface-inspector': FrakonSurfaceInspector;
  }
}
