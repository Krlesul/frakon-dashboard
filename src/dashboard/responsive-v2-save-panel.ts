import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import type { ResponsiveCanvasV2SavePreview } from './responsive-v2-save-preview';
import { responsiveV2SaveTranslate } from './responsive-v2-save-i18n';

@customElement('frakon-responsive-v2-save-panel')
export class FrakonResponsiveV2SavePanel extends LitElement {
  @property({ attribute: false }) preview?: ResponsiveCanvasV2SavePreview;
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @property({ attribute: false }) serverValidatedRevision?: string;

  static styles = css`
    :host { display: block; }
    .panel { display: grid; gap: 8px; padding: 11px 12px; border-radius: 14px; background: color-mix(in srgb, var(--card-background-color) 90%, var(--primary-color) 10%); border: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .title { font-size: 12px; font-weight: 700; }
    .status { padding: 4px 7px; border-radius: 999px; font-size: 11px; background: color-mix(in srgb, #4bbf73 18%, transparent); }
    .status.blocked { background: color-mix(in srgb, #ff4d67 17%, transparent); }
    .status.clean { background: color-mix(in srgb, var(--primary-text-color) 10%, transparent); }
    .meta { display: grid; gap: 4px; font-size: 11px; opacity: .82; }
    .blockers { display: grid; gap: 4px; }
    .blocker { padding: 6px 8px; border-radius: 8px; font-size: 11px; background: color-mix(in srgb, #ff4d67 13%, transparent); }
    button { justify-self: start; border: 0; border-radius: 9px; padding: 7px 10px; color: inherit; background: color-mix(in srgb, var(--primary-color) 18%, transparent); cursor: pointer; font: inherit; }
    button:disabled { opacity: .38; cursor: not-allowed; }
  `;

  private t(key: Parameters<typeof responsiveV2SaveTranslate>[1]): string {
    return responsiveV2SaveTranslate(this.language, key);
  }

  private validationMatchesCandidate(): boolean {
    const candidateRevision = this.preview?.candidate.revision;
    return !!candidateRevision && this.serverValidatedRevision === candidateRevision;
  }

  private requestSave(): void {
    if (!this.preview?.wouldWrite || !this.validationMatchesCandidate()) return;
    this.dispatchEvent(new CustomEvent('frakon-responsive-v2-save-request', {
      detail: { candidate: this.preview.candidate },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const preview = this.preview;
    if (!preview) return nothing;
    const validationMatches = this.validationMatchesCandidate();
    const saveAllowed = preview.wouldWrite && validationMatches;
    const status = !preview.hasLocalChanges
      ? { className: 'clean', label: this.t('clean') }
      : saveAllowed
        ? { className: '', label: this.t('ready') }
        : { className: 'blocked', label: this.t('blocked') };

    return html`<section class="panel">
      <div class="head">
        <span class="title">${this.t('title')}</span>
        <span class="status ${status.className}">${status.label}</span>
      </div>
      <div class="meta">
        <span>${this.t('dirtyBreakpoints')}: ${preview.dirtyBreakpoints.length ? preview.dirtyBreakpoints.join(' · ') : this.t('noDirtyBreakpoints')}</span>
        <span>${this.t('baseRevision')}: ${preview.baseRevision ?? '—'}</span>
        <span>${this.t('candidateRevision')}: ${preview.candidate.revision}</span>
      </div>
      ${preview.readiness.blockers.length || (preview.wouldWrite && !validationMatches) ? html`<div class="blockers">
        ${preview.readiness.blockers.map((blocker) => html`<div class="blocker">${this.t(blocker)}</div>`)}
        ${preview.wouldWrite && !validationMatches ? html`<div class="blocker">${this.t('validationRequired')}</div>` : nothing}
      </div>` : nothing}
      <button ?disabled=${!saveAllowed} @click=${this.requestSave}>${this.t('save')}</button>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-responsive-v2-save-panel': FrakonResponsiveV2SavePanel;
  }
}
