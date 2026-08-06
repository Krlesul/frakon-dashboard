import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SurfaceStyle } from '../../../packages/design-system/src/surface-style';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import {
  applySurfaceStyleToTarget,
  clearItemSurfaceStyle,
  type DashboardSurfaceTarget,
} from '../../../src/dashboard/surface-style-actions';
import { resolveItemSurfaceStyle } from '../../../src/dashboard/surface-style-resolver';
import type { FrakonSurfaceStyleChangedDetail } from './surface-style-editor';
import './surface-style-editor';

export interface FrakonStudioDocumentChangedDetail {
  document: FrakonDashboardDocument;
  target: DashboardSurfaceTarget;
}

type InspectorMode = 'auto' | 'dashboard' | 'card-defaults';

@customElement('frakon-surface-inspector')
export class FrakonSurfaceInspector extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @property() mode: InspectorMode = 'auto';

  static styles = css`
    :host { display:block; }
    .shell { display:grid; gap:12px; }
    .targets { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
    button { border:1px solid rgb(255 255 255 / 10%); border-radius:10px; padding:9px; color:inherit; background:rgb(255 255 255 / 6%); cursor:pointer; }
    button[aria-pressed='true'] { background:rgb(105 167 255 / 18%); border-color:rgb(105 167 255 / 45%); }
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
    return first ? resolveItemSurfaceStyle(this.document, first) : (this.document.cardSurface ?? {});
  }

  private emitDocument(document: FrakonDashboardDocument, target: DashboardSurfaceTarget): void {
    this.document = document;
    this.dispatchEvent(new CustomEvent<FrakonStudioDocumentChangedDetail>('frakon-studio-document-changed', {
      detail: { document: structuredClone(document), target },
      bubbles: true,
      composed: true,
    }));
  }

  private onStyleChanged(event: CustomEvent<FrakonSurfaceStyleChangedDetail>): void {
    if (!this.document) return;
    const target = this.target();
    this.emitDocument(applySurfaceStyleToTarget(this.document, target, event.detail.style), target);
  }

  private clearOverrides(): void {
    if (!this.document) return;
    const target = this.target();
    if (target.kind !== 'items') return;
    this.emitDocument(clearItemSurfaceStyle(this.document, target.ids), target);
  }

  render() {
    const target = this.target();
    return html`
      <section class="shell">
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
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-surface-inspector': FrakonSurfaceInspector;
  }
}
