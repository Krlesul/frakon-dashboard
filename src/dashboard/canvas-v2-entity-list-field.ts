import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import { dashboardCanvasV2EntityOptions } from './dashboard-canvas-v2-entity-options';

export interface FrakonCanvasV2EntityListChangedDetail { value: string[]; }

export function toggleDashboardCanvasV2EntityList(selected: readonly string[], entityId: string, checked: boolean): string[] {
  const next = new Set(selected.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim()));
  if (checked) next.add(entityId); else next.delete(entityId);
  return [...next].sort();
}

@customElement('frakon-canvas-v2-entity-list-field')
export class FrakonCanvasV2EntityListField extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) domains?: readonly string[];
  @property({ attribute: false }) selected: string[] = [];
  @property() label = '';

  static styles = css`
    :host { display:block; min-width:0; }
    .field { display:grid; gap:6px; padding:6px 7px; border-radius:9px; background:color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); }
    .label { font-size:10px; opacity:.65; }
    .list { display:grid; gap:4px; max-height:180px; overflow:auto; }
    label { display:flex; align-items:flex-start; gap:6px; min-width:0; font-size:11px; }
    input { flex:0 0 auto; margin-top:2px; }
    .name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .id { display:block; opacity:.55; font-size:9px; }
    .empty { font-size:10px; opacity:.55; }
  `;

  private normalizedSelected(): string[] {
    return toggleDashboardCanvasV2EntityList(this.selected, '', false).filter(Boolean);
  }

  private toggle(entityId: string, checked: boolean): void {
    const value = toggleDashboardCanvasV2EntityList(this.normalizedSelected(), entityId, checked);
    this.selected = value;
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2EntityListChangedDetail>('frakon-canvas-v2-entity-list-changed', {
      detail: { value }, bubbles: true, composed: true,
    }));
  }

  render() {
    const selected = this.normalizedSelected();
    const options = dashboardCanvasV2EntityOptions(this.hass, this.domains, selected);
    return html`<div class="field"><span class="label">${this.label}</span><div class="list">
      ${options.length ? options.map((option) => html`<label><input type="checkbox" .checked=${selected.includes(option.entityId)} @change=${(event:Event) => this.toggle(option.entityId, (event.currentTarget as HTMLInputElement).checked)}><span class="name">${option.label}<span class="id">${option.entityId}</span></span></label>`) : html`<span class="empty">No matching entities</span>`}
    </div></div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-entity-list-field': FrakonCanvasV2EntityListField; } }
