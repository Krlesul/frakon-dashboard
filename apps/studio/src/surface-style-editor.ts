import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  cssRecordToString,
  normalizeSurfaceStyle,
  surfaceStyleToCss,
  type SurfaceBorderMode,
  type SurfaceFillMode,
  type SurfaceStyle,
} from '../../../packages/design-system/src/surface-style';
import {
  SURFACE_PRESETS,
  surfacePreset,
  type SurfacePresetId,
} from '../../../packages/design-system/src/surface-presets';

export interface FrakonSurfaceStyleChangedDetail {
  style: SurfaceStyle;
}

@customElement('frakon-surface-style-editor')
export class FrakonSurfaceStyleEditor extends LitElement {
  @property({ attribute: false }) surfaceStyle: SurfaceStyle = {};
  @property() target = 'Surface';

  static styles = css`
    :host { display:block; color:var(--primary-text-color,#f7f8fb); font-family:Inter,system-ui,sans-serif; }
    .panel { display:grid; gap:16px; padding:18px; border:1px solid rgb(255 255 255 / 10%); border-radius:20px; background:#12151c; }
    header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    h3 { margin:0; font-size:16px; }
    small { opacity:.62; }
    .presets { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
    button,select,input { border:1px solid rgb(255 255 255 / 10%); border-radius:10px; color:inherit; background:rgb(255 255 255 / 6%); font:inherit; }
    button { padding:9px 10px; cursor:pointer; }
    button:hover { background:rgb(255 255 255 / 11%); }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    label { display:grid; gap:6px; font-size:12px; opacity:.9; }
    input,select { min-width:0; padding:8px 9px; }
    input[type='range'] { padding:0; }
    input[type='color'] { width:100%; min-height:38px; padding:3px; }
    .wide { grid-column:1/-1; }
    .preview-wrap { display:grid; gap:8px; }
    .preview { min-height:120px; display:grid; place-items:center; overflow:hidden; }
    .preview-content { padding:18px; text-align:center; }
    .preview-content strong { display:block; margin-bottom:6px; }
    @media (max-width:620px) { .presets,.grid { grid-template-columns:1fr; } .wide { grid-column:auto; } }
  `;

  private emit(patch: Partial<SurfaceStyle>): void {
    const nextStyle = normalizeSurfaceStyle({ ...this.surfaceStyle, ...patch });
    this.surfaceStyle = nextStyle;
    this.dispatchEvent(new CustomEvent<FrakonSurfaceStyleChangedDetail>('frakon-surface-style-changed', {
      detail: { style: structuredClone(nextStyle) },
      bubbles: true,
      composed: true,
    }));
  }

  private numberValue(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  private stringValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private applyPreset(id: SurfacePresetId): void {
    const nextStyle = normalizeSurfaceStyle(surfacePreset(id));
    this.surfaceStyle = nextStyle;
    this.dispatchEvent(new CustomEvent<FrakonSurfaceStyleChangedDetail>('frakon-surface-style-changed', {
      detail: { style: structuredClone(nextStyle) },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const style = normalizeSurfaceStyle(this.surfaceStyle);
    const previewStyle = cssRecordToString(surfaceStyleToCss(style));
    return html`
      <section class="panel">
        <header><div><h3>${this.target}</h3><small>Surface appearance</small></div></header>
        <div class="presets">
          ${SURFACE_PRESETS.map((preset) => html`
            <button @click=${() => this.applyPreset(preset.id)}>${preset.label}</button>
          `)}
        </div>
        <div class="grid">
          <label>Fill
            <select .value=${style.fill ?? 'theme'} @change=${(event:Event) => this.emit({ fill:this.stringValue(event) as SurfaceFillMode })}>
              <option value="theme">Theme</option><option value="transparent">Transparent</option>
              <option value="solid">Solid</option><option value="glass">Glass</option>
              <option value="gradient">Gradient</option><option value="image">Image</option>
            </select>
          </label>
          <label>Border
            <select .value=${style.border ?? 'theme'} @change=${(event:Event) => this.emit({ border:this.stringValue(event) as SurfaceBorderMode })}>
              <option value="theme">Theme</option><option value="none">None</option><option value="solid">Solid</option>
            </select>
          </label>
          ${style.fill === 'solid' || style.fill === 'glass' ? html`
            <label>Background color<input type="color" .value=${style.backgroundColor ?? '#171a22'} @input=${(event:Event) => this.emit({ backgroundColor:this.stringValue(event) })}></label>
          ` : nothing}
          <label>Background opacity
            <input type="range" min="0" max="1" step="0.01" .value=${String(style.backgroundOpacity ?? 1)} @input=${(event:Event) => this.emit({ backgroundOpacity:this.numberValue(event) })}>
          </label>
          ${style.fill === 'glass' ? html`
            <label>Backdrop blur
              <input type="range" min="0" max="80" step="1" .value=${String(style.backdropBlur ?? 0)} @input=${(event:Event) => this.emit({ backdropBlur:this.numberValue(event) })}>
            </label>
          ` : nothing}
          ${style.fill === 'gradient' ? html`
            <label class="wide">Gradient<input .value=${style.gradient ?? ''} @input=${(event:Event) => this.emit({ gradient:this.stringValue(event) })}></label>
          ` : nothing}
          ${style.fill === 'image' ? html`
            <label class="wide">Image URL<input .value=${style.backgroundImage ?? ''} @input=${(event:Event) => this.emit({ backgroundImage:this.stringValue(event) })}></label>
          ` : nothing}
          ${style.border === 'solid' ? html`
            <label>Border color<input type="color" .value=${style.borderColor ?? '#ffffff'} @input=${(event:Event) => this.emit({ borderColor:this.stringValue(event) })}></label>
          ` : nothing}
          <label>Border opacity<input type="range" min="0" max="1" step="0.01" .value=${String(style.borderOpacity ?? 1)} @input=${(event:Event) => this.emit({ borderOpacity:this.numberValue(event) })}></label>
          <label>Border width<input type="number" min="0" max="16" .value=${String(style.borderWidth ?? 1)} @input=${(event:Event) => this.emit({ borderWidth:this.numberValue(event) })}></label>
          <label>Corner radius<input type="number" min="0" max="128" .value=${String(style.borderRadius ?? 20)} @input=${(event:Event) => this.emit({ borderRadius:this.numberValue(event) })}></label>
          <label>Padding<input type="number" min="0" max="128" .value=${String(style.padding ?? 0)} @input=${(event:Event) => this.emit({ padding:this.numberValue(event) })}></label>
          <label class="wide">Shadow<input .value=${style.shadow ?? ''} placeholder="0 24px 70px rgb(0 0 0 / 24%)" @input=${(event:Event) => this.emit({ shadow:this.stringValue(event) })}></label>
        </div>
        <div class="preview-wrap"><small>Preview</small><div class="preview" style=${previewStyle}><div class="preview-content"><strong>FRAKON surface</strong><span>Live appearance preview</span></div></div></div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-surface-style-editor': FrakonSurfaceStyleEditor;
  }
}
