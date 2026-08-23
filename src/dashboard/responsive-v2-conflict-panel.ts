import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import type { FrakonBreakpoint } from './layout-model';
import type { ResponsiveCanvasV2ConflictSelections } from './responsive-v2-conflict-resolution';
import type { ResponsiveCanvasV2ConflictSession } from './responsive-v2-sync-controller';
import { responsiveV2ConflictTranslate } from './responsive-v2-conflict-i18n';

@customElement('frakon-responsive-v2-conflict-panel')
export class FrakonResponsiveV2ConflictPanel extends LitElement {
  @property({ attribute: false }) conflict?: ResponsiveCanvasV2ConflictSession;
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private selections: ResponsiveCanvasV2ConflictSelections = {};

  static styles = css`
    :host { display: block; }
    .panel { display: grid; gap: 9px; padding: 12px; border-radius: 14px; border: 1px solid color-mix(in srgb, #ff4d67 25%, transparent); background: color-mix(in srgb, #ff4d67 8%, var(--card-background-color)); }
    .title { font-size: 12px; font-weight: 750; }
    .rows { display: grid; gap: 7px; }
    .row { display: grid; grid-template-columns: minmax(80px, .6fr) 1fr auto; gap: 8px; align-items: center; padding: 8px; border-radius: 10px; background: color-mix(in srgb, var(--card-background-color) 93%, var(--primary-text-color) 7%); }
    .bp { font-size: 12px; font-weight: 700; text-transform: capitalize; }
    .reason { font-size: 11px; opacity: .75; }
    .choice { display: inline-flex; gap: 4px; }
    button { border: 0; border-radius: 8px; padding: 6px 8px; color: inherit; background: color-mix(in srgb, var(--primary-text-color) 8%, transparent); cursor: pointer; font: inherit; font-size: 11px; }
    button.selected { background: color-mix(in srgb, var(--primary-color) 24%, transparent); font-weight: 700; }
    button.resolve { justify-self: start; background: color-mix(in srgb, var(--primary-color) 20%, transparent); }
    button:disabled { opacity: .38; cursor: not-allowed; }
    .summary { font-size: 11px; opacity: .72; }
    @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
  `;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('conflict')) this.selections = {};
  }

  private t(key: Parameters<typeof responsiveV2ConflictTranslate>[1]): string {
    return responsiveV2ConflictTranslate(this.language, key);
  }

  private choose(breakpoint: FrakonBreakpoint, choice: 'local' | 'remote'): void {
    this.selections = { ...this.selections, [breakpoint]: choice };
  }

  private resolve(): void {
    const conflict = this.conflict;
    if (!conflict) return;
    const unresolved = conflict.merge.conflicts.some(({ breakpoint }) => !this.selections[breakpoint]);
    if (unresolved) return;
    this.dispatchEvent(new CustomEvent('frakon-responsive-v2-conflict-resolve', {
      detail: { selections: { ...this.selections } },
      bubbles: true,
      composed: true,
    }));
  }

  private itemCount(side: 'local' | 'remote', breakpoint: FrakonBreakpoint): string {
    const document = this.conflict?.[side].bundle.documents[breakpoint];
    return document ? `${document.items.length} ${this.t('items')}` : this.t('deleted');
  }

  render() {
    const conflict = this.conflict;
    if (!conflict) return nothing;
    const complete = conflict.merge.conflicts.every(({ breakpoint }) => this.selections[breakpoint]);
    return html`<section class="panel">
      <div class="title">${this.t('title')}</div>
      <div class="rows">
        ${conflict.merge.conflicts.map(({ breakpoint, reason }) => html`
          <div class="row">
            <div><div class="bp">${breakpoint}</div><div class="summary">${this.itemCount('local', breakpoint)} · ${this.itemCount('remote', breakpoint)}</div></div>
            <div class="reason">${this.t(reason)}</div>
            <div class="choice">
              <button class=${this.selections[breakpoint] === 'local' ? 'selected' : ''} @click=${() => this.choose(breakpoint, 'local')}>${this.t('local')}</button>
              <button class=${this.selections[breakpoint] === 'remote' ? 'selected' : ''} @click=${() => this.choose(breakpoint, 'remote')}>${this.t('remote')}</button>
            </div>
          </div>
        `)}
      </div>
      ${complete ? nothing : html`<div class="summary">${this.t('unresolved')}</div>`}
      <button class="resolve" ?disabled=${!complete} @click=${this.resolve}>${this.t('resolve')}</button>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-responsive-v2-conflict-panel': FrakonResponsiveV2ConflictPanel;
  }
}
