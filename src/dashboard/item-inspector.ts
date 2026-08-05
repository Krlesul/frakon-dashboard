import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { FrakonGridItem } from './layout-model';

export interface FrakonItemUpdateDetail {
  id: string;
  card: Record<string, unknown>;
}

@customElement('frakon-item-inspector')
export class FrakonItemInspector extends LitElement {
  @property({ attribute: false }) item?: FrakonGridItem;
  @state() private draft = '';
  @state() private error?: string;

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:12px; margin:0 0 16px; padding:16px; border:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent); border-radius:18px; background:color-mix(in srgb,var(--card-background-color) 94%,var(--primary-color) 6%); }
    header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    h3 { margin:0; font-size:16px; }
    .meta { opacity:.62; font-size:12px; }
    textarea { box-sizing:border-box; width:100%; min-height:180px; resize:vertical; padding:12px; border:1px solid var(--divider-color); border-radius:12px; color:inherit; background:var(--card-background-color); font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
    .actions { display:flex; justify-content:flex-end; gap:8px; }
    button { border:0; border-radius:10px; padding:8px 12px; color:inherit; background:color-mix(in srgb,var(--primary-text-color) 10%,transparent); cursor:pointer; }
    button.primary { background:var(--primary-color); color:var(--text-primary-color,#fff); }
    .error { padding:9px 11px; border-radius:10px; background:color-mix(in srgb,#ff4d67 16%,transparent); font-size:13px; }
  `;

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('item')) {
      this.draft = this.item ? JSON.stringify(this.item.card, null, 2) : '';
      this.error = undefined;
    }
  }

  private reset(): void {
    this.draft = this.item ? JSON.stringify(this.item.card, null, 2) : '';
    this.error = undefined;
  }

  private apply(): void {
    if (!this.item) return;
    try {
      const parsed: unknown = JSON.parse(this.draft);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Card configuration must be a JSON object.');
      const card = parsed as Record<string, unknown>;
      if (typeof card.type !== 'string' || !card.type) throw new Error('Card configuration requires a type.');
      this.error = undefined;
      this.dispatchEvent(new CustomEvent<FrakonItemUpdateDetail>('frakon-item-config-changed', {
        detail:{ id:this.item.id, card }, bubbles:true, composed:true,
      }));
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Invalid card configuration.';
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('frakon-item-inspector-close', { bubbles:true, composed:true }));
  }

  render() {
    if (!this.item) return nothing;
    return html`
      <section class="panel">
        <header><div><h3>Card configuration</h3><div class="meta">${this.item.id} · ${this.item.w} × ${this.item.h}</div></div><button @click=${this.close}>Close</button></header>
        ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
        <textarea .value=${this.draft} @input=${(event:Event) => { this.draft = (event.target as HTMLTextAreaElement).value; }}></textarea>
        <div class="actions"><button @click=${this.reset}>Reset</button><button class="primary" @click=${this.apply}>Apply</button></div>
      </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-item-inspector': FrakonItemInspector; } }
