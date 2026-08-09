import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SURFACE_PRESETS, surfacePreset, type SurfacePresetId } from '../../packages/design-system/src/surface-presets';
import { normalizeSurfaceStyle, type SurfaceBorderMode, type SurfaceFillMode, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import { applyDashboardCanvasV2SurfaceStyle, clearDashboardCanvasV2SurfaceStyle, type DashboardCanvasV2SurfaceTarget } from './dashboard-canvas-v2-surface-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { resolveCanvasItemSurface, resolveDashboardSurfaces } from './surface-style-resolver';

type SurfaceEditorTarget = 'card-defaults' | 'selection';

@customElement('frakon-canvas-v2-surface-editor')
export class FrakonCanvasV2SurfaceEditor extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @state() private target: SurfaceEditorTarget = 'selection';

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:9px; padding:10px; border-radius:12px; border:1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); background:color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%); }
    .head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .title { font-size:12px; font-weight:700; }
    .targets,.presets,.grid { display:grid; gap:6px; }
    .targets { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .presets { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
    button,select,input { min-width:0; box-sizing:border-box; border:0; border-radius:8px; padding:6px 7px; color:inherit; background:color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font:inherit; font-size:11px; }
    button { cursor:pointer; }
    button.active { background:color-mix(in srgb, var(--primary-color) 26%, transparent); font-weight:700; }
    button:disabled { opacity:.38; cursor:not-allowed; }
    label { display:grid; gap:3px; font-size:10px; opacity:.9; }
    .wide { grid-column:span 2; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .hint { font-size:10px; opacity:.62; }
    @media (max-width:700px) { .presets,.grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .wide { grid-column:span 2; } }
  `;

  private selectedItems() {
    if (!this.document) return [];
    const selected = new Set(this.selectedIds);
    return this.document.items.filter((item) => selected.has(item.id));
  }

  private selectionAvailable(): boolean {
    return this.selectedItems().some((item) => !item.locked);
  }

  private currentStyle(): SurfaceStyle {
    if (!this.document) return {};
    if (this.target === 'card-defaults') return resolveDashboardSurfaces(this.document).card;
    const first = this.selectedItems()[0];
    return first ? resolveCanvasItemSurface(this.document, first) : resolveDashboardSurfaces(this.document).card;
  }

  private actionTarget(): DashboardCanvasV2SurfaceTarget | undefined {
    if (this.target === 'card-defaults') return { kind: 'card-defaults' };
    if (!this.selectionAvailable()) return undefined;
    return { kind: 'items', ids: this.selectedIds };
  }

  private commit(style: SurfaceStyle): void {
    if (!this.document) return;
    const target = this.actionTarget();
    if (!target) return;
    const result = applyDashboardCanvasV2SurfaceStyle(this.document, target, style);
    if (result.status !== 'committed') return;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
  }

  private patch(patch: Partial<SurfaceStyle>): void {
    this.commit(normalizeSurfaceStyle({ ...this.currentStyle(), ...patch }));
  }

  private applyPreset(id: SurfacePresetId): void {
    this.commit(surfacePreset(id));
  }

  private clearOverride(): void {
    if (!this.document) return;
    const target = this.actionTarget();
    if (!target) return;
    const result = clearDashboardCanvasV2SurfaceStyle(this.document, target);
    if (result.status !== 'committed') return;
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
  }

  private number(event: Event): number {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  private text(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value;
  }

  render() {
    if (!this.document) return nothing;
    const selectionAvailable = this.selectionAvailable();
    if (this.target === 'selection' && !selectionAvailable) this.target = 'card-defaults';
    const style = normalizeSurfaceStyle(this.currentStyle());
    return html`<section class="panel">
      <div class="head"><span class="title">Surface</span><span class="hint">${this.target === 'selection' ? `${this.selectedIds.length} selected` : 'Card defaults'}</span></div>
      <div class="targets">
        <button class=${this.target === 'card-defaults' ? 'active' : ''} @click=${() => { this.target = 'card-defaults'; }}>Card defaults</button>
        <button class=${this.target === 'selection' ? 'active' : ''} ?disabled=${!selectionAvailable} @click=${() => { this.target = 'selection'; }}>Selection</button>
      </div>
      <div class="presets">${SURFACE_PRESETS.map((preset) => html`<button @click=${() => this.applyPreset(preset.id)}>${preset.label}</button>`)}</div>
      <div class="grid">
        <label>Fill<select .value=${style.fill ?? 'theme'} @change=${(event: Event) => this.patch({ fill: this.text(event) as SurfaceFillMode })}><option value="theme">Theme</option><option value="transparent">Transparent</option><option value="solid">Solid</option><option value="glass">Glass</option><option value="gradient">Gradient</option><option value="image">Image</option></select></label>
        <label>Border<select .value=${style.border ?? 'theme'} @change=${(event: Event) => this.patch({ border: this.text(event) as SurfaceBorderMode })}><option value="theme">Theme</option><option value="none">None</option><option value="solid">Solid</option></select></label>
        <label>Radius<input type="number" min="0" max="128" .value=${String(style.borderRadius ?? 18)} @change=${(event: Event) => this.patch({ borderRadius: this.number(event) })}></label>
        <label>Padding<input type="number" min="0" max="128" .value=${String(style.padding ?? 0)} @change=${(event: Event) => this.patch({ padding: this.number(event) })}></label>
        ${style.fill === 'solid' || style.fill === 'glass' ? html`<label>Background<input type="color" .value=${style.backgroundColor ?? '#171a22'} @input=${(event: Event) => this.patch({ backgroundColor: this.text(event) })}></label>` : nothing}
        <label>Opacity<input type="number" min="0" max="1" step="0.05" .value=${String(style.backgroundOpacity ?? 1)} @change=${(event: Event) => this.patch({ backgroundOpacity: this.number(event) })}></label>
        ${style.fill === 'glass' ? html`<label>Blur<input type="number" min="0" max="80" .value=${String(style.backdropBlur ?? 0)} @change=${(event: Event) => this.patch({ backdropBlur: this.number(event) })}></label>` : nothing}
        ${style.border === 'solid' ? html`<label>Border width<input type="number" min="0" max="16" .value=${String(style.borderWidth ?? 1)} @change=${(event: Event) => this.patch({ borderWidth: this.number(event) })}></label><label>Border color<input type="color" .value=${style.borderColor ?? '#ffffff'} @input=${(event: Event) => this.patch({ borderColor: this.text(event) })}></label>` : nothing}
        ${style.fill === 'gradient' ? html`<label class="wide">Gradient<input type="text" .value=${style.gradient ?? ''} @change=${(event: Event) => this.patch({ gradient: this.text(event) })}></label>` : nothing}
        ${style.fill === 'image' ? html`<label class="wide">Image URL<input type="text" .value=${style.backgroundImage ?? ''} @change=${(event: Event) => this.patch({ backgroundImage: this.text(event) })}></label>` : nothing}
        <label class="wide">Shadow<input type="text" .value=${style.shadow ?? ''} @change=${(event: Event) => this.patch({ shadow: this.text(event) })}></label>
      </div>
      <div class="actions"><button @click=${this.clearOverride}>${this.target === 'selection' ? 'Inherit defaults' : 'Reset defaults'}</button></div>
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-surface-editor': FrakonCanvasV2SurfaceEditor; } }
