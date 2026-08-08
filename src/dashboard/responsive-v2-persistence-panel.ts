import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import './responsive-v2-save-panel';
import { ResponsiveCanvasV2SavePreviewSession } from './responsive-v2-save-preview-session';

function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `canvas-${crypto.randomUUID()}`;
  return `canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

@customElement('frakon-responsive-v2-persistence-panel')
export class FrakonResponsiveV2PersistencePanel extends LitElement {
  @property({ attribute: false }) controller?: ResponsiveV2DraftController;
  @property({ attribute: false }) capabilities?: DashboardServerCapabilities;
  @property({ attribute: false }) baseRevision?: string;
  @property({ attribute: false }) hasUnresolvedConflict = false;
  @property({ attribute: false }) language: SupportedLanguage = 'en';

  private readonly previewSession = new ResponsiveCanvasV2SavePreviewSession(createClientId());

  static styles = css`:host{display:block}`;

  render() {
    if (!this.controller || !this.capabilities) return nothing;
    const preview = this.previewSession.preview({
      controller: this.controller,
      capabilities: this.capabilities,
      baseRevision: this.baseRevision,
      hasUnresolvedConflict: this.hasUnresolvedConflict,
    });
    return html`<frakon-responsive-v2-save-panel
      .preview=${preview}
      .language=${this.language}
    ></frakon-responsive-v2-save-panel>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-responsive-v2-persistence-panel': FrakonResponsiveV2PersistencePanel;
  }
}
