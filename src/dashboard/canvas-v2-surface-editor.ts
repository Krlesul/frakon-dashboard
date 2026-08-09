import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { SURFACE_PRESETS, surfacePreset, type SurfacePresetId } from '../../packages/design-system/src/surface-presets';
import { normalizeSurfaceStyle, type SurfaceBorderMode, type SurfaceFillMode, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { SupportedLanguage } from '../i18n';
import { applyDashboardCanvasV2SurfaceStyle, clearDashboardCanvasV2SurfaceStyle, type DashboardCanvasV2SurfaceTarget } from './dashboard-canvas-v2-surface-actions';
import { canvasV2SurfaceTranslate, type CanvasV2SurfaceTranslationKey } from './canvas-v2-surface-i18n';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { resolveCanvasItemSurface, resolveDashboardSurfaces } from './surface-style-resolver';

type SurfaceEditorTarget = 'card-defaults' | 'selection';

@customElement('frakon-canvas-v2-surface-editor')
export class FrakonCanvasV2SurfaceEditor extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
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

  private inheritedLanguage(): SupportedLanguage {
    const root = this.getRootNode();
    if (root instanceof ShadowRoot) {
      const hostLanguage = (root.host as HTMLElement & { language?: SupportedLanguage }).language;
      if (hostLanguage) return hostLanguage;
    }
    return this.language;
  }

  private t(key: CanvasV2SurfaceTranslationKey): string { return canvasV2SurfaceTranslate(this.inheritedLanguage(), key); }

  private selectedItems() {
    if (!this.document) return [];
    const selected = new Set(this.selectedIds);
    return this.document.items.filter((item) => selected.has(item.id));
  }

  private selectionAvailable(): boolean {
    return this.selectedItems().some((item) => !item.locked);
  }

  private effectiveTarget(): SurfaceEditorTarget {
    return this.target === 'selection' && !this.selectionAvailable() ? 'card-defaults' : this.target;
  }

  private currentStyle(): SurfaceStyle {
    if (!this.document) return {};
    if (this.effectiveTarget() === 'card-defaults') return resolveDashboardSurfaces(this.document).card;
    const first = this.selectedItems()[0];
    return first ? resolveCanvasItemSurface(this.document, first) : resolveDashboardSurfaces(this.document).card;
  }

  private actionTarget(): DashboardCanvasV2SurfaceTarget | undefined {
    if (this.effectiveTarget() === 'card-defaults') return { kind: 'card-defaults' };
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

  private number(event: Event): number { return Number((event.currentTarget as HTMLInputElement).value); }
  private text(event: Event): string { return (event.currentTarget as HTMLInputElement | HTMLSelectElement).value; }
  private presetLabel(id: SurfacePresetId): string { return this.t(id); }

  render() {
    if (!this.document) return nothing;
    const selectionAvailable = this.selectionAvailable();
    const target = this.effectiveTarget();
    const style = normalizeSurfaceStyle(this.currentStyle());
    return html`<section class="panel">
      <div class="head"><span class="title">${this.t('surface')}</span><span class="hint">${target === 'selection' ? `${this.selectedIds.length} ${this.t('selected')}` : this.t('cardDefaults')}</span></div>
      <div class="targets">
        <button class=${target === 'card-defaults' ? 'active' : ''} @click=${() => { this.target = 'card-defaults'; }}>${this.t('cardDefaults')}</button>
        <button class=${target === 'selection' ? 'active' : ''} ?disabled=${!selectionAvailable} @click=${() => { this.target = 'selection'; }}>${this.t('selection')}</button>
      </div>
      <div class="presets">${SURFACE_PRESETS.map((preset) => html`<button @click=${() => this.applyPreset(preset.id)}>${this.presetLabel(preset.id)}</button>`)}</div>
      <div class="grid">
        <label>${this.t('fill')}<select .value=${style.fill ?? 'theme'} @change=${(event: Event) => this.patch({ fill: this.text(event) as SurfaceFillMode })}><option value="theme">${this.t('theme')}</option><option value="transparent">${this.t('transparent')}</option><option value="solid">${this.t('solid')}</option><option value="glass">${this.t('glass')}</option><option value="gradient">${this.t('gradient')}</option><option value="image">${this.t('image')}</option></select></label>
        <label>${this.t('border')}<select .value=${style.border ?? 'theme'} @change=${(event: Event) => this.patch({ border: this.text(event) as SurfaceBorderMode })}><option value="theme">${this.t('theme')}</option><option value="none">${this.t('none')}</option><option value="solid">${this.t('solid')}</option></select></label>
        <label>${this.t('radius')}<input type="number" min="0" max="128" .value=${String(style.borderRadius ?? 18)} @change=${(event: Event) => this.patch({ borderRadius: this.number(event) })}></label>
        <label>${this.t('padding')}<input type="number" min="0" max="128" .value=${String(style.padding ?? 0)} @change=${(event: Event) => this.patch({ padding: this.number(event) })}></label>
        ${style.fill === 'solid' || style.fill === 'glass' ? html`<label>${this.t('background')}<input type="color" .value=${style.backgroundColor ?? '#171a22'} @input=${(event: Event) => this.patch({ backgroundColor: this.text(event) })}></label>` : nothing}
        <label>${this.t('opacity')}<input type="number" min="0" max="1" step="0.05" .value=${String(style.backgroundOpacity ?? 1)} @change=${(event: Event) => this.patch({ backgroundOpacity: this.number(event) })}></label>
        ${style.fill === 'glass' ? html`<label>${this.t('blur')}<input type="number" min="0" max="80" .value=${String(style.backdropBlur ?? 0)} @change=${(event: Event) => this.patch({ backdropBlur: this.number(event) })}></label>` : nothing}
        ${style.border === 'solid' ? html`<label>${this.t('borderWidth')}<input type="number" min="0" max="16" .value=${String(style.borderWidth ?? 1)} @change=${(event: Event) => this.patch({ borderWidth: this.number(event) })}></label><label>${this.t('borderColor')}<input type="color" .value=${style.borderColor ?? '#ffffff'} @input=${(event: Event) => this.patch({ borderColor: this.text(event) })}></label>` : nothing}
        ${style.fill === 'gradient' ? html`<label class="wide">${this.t('gradient')}<input type="text" .value=${style.gradient ?? ''} @change=${(event: Event) => this.patch({ gradient: this.text(event) })}></label>` : nothing}
        ${style.fill === 'image' ? html`<label class="wide">${this.t('imageUrl')}<input type="text" .value=${style.backgroundImage ?? ''} @change=${(event: Event) => this.patch({ backgroundImage: this.text(event) })}></label>` : nothing}
        <label class="wide">${this.t('shadow')}<input type="text" .value=${style.shadow ?? ''} @change=${(event: Event) => this.patch({ shadow: this.text(event) })}></label>
      </div>
      <div class="actions"><button @click=${this.clearOverride}>${target === 'selection' ? this.t('inheritDefaults') : this.t('resetDefaults')}</button></div>
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-surface-editor': FrakonCanvasV2SurfaceEditor; } }
