import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SupportedLanguage } from '../i18n';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { DashboardStorageTransport } from './dashboard-storage';
import './responsive-v2-conflict-panel';
import type { ResponsiveCanvasV2ConflictSelections } from './responsive-v2-conflict-resolution';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { dryRunResponsiveV2EditorCandidate, resolveResponsiveV2EditorConflict, saveResponsiveV2EditorCandidate } from './responsive-v2-editor-save-coordinator';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';
import { responsiveV2SavedState } from './responsive-v2-saved-state';
import { responsiveV2SaveTranslate } from './responsive-v2-save-i18n';
import './responsive-v2-save-panel';
import { ResponsiveCanvasV2SavePreviewSession } from './responsive-v2-save-preview-session';
import type { ResponsiveCanvasV2ConflictSession } from './responsive-v2-sync-controller';

function clientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `editor-${crypto.randomUUID()}`;
  return `editor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

@customElement('frakon-responsive-v2-persistence-action-panel')
export class FrakonResponsiveV2PersistenceActionPanel extends LitElement {
  @property({ attribute: false }) transport?: DashboardStorageTransport;
  @property({ attribute: false }) capabilities?: DashboardServerCapabilities;
  @property({ attribute: false }) controller?: ResponsiveV2DraftController;
  @property({ attribute: false }) baseRevision?: string;
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @property({ attribute: false }) hasUnresolvedConflict = false;

  @state() private saving = false;
  @state() private conflict?: ResponsiveCanvasV2ConflictSession;
  @state() private message?: string;

  private readonly previewSession = new ResponsiveCanvasV2SavePreviewSession(clientId());

  static styles = css`
    :host { display:block; }
    .stack { display:grid; gap:10px; }
    .actions { display:flex; gap:7px; flex-wrap:wrap; }
    button { border:0; border-radius:9px; padding:7px 10px; color:inherit; background:color-mix(in srgb, var(--primary-color) 16%, transparent); cursor:pointer; font:inherit; font-size:11px; }
    button:disabled { opacity:.38; cursor:not-allowed; }
    .message { padding:7px 9px; border-radius:9px; font-size:11px; background:color-mix(in srgb, var(--primary-text-color) 8%, transparent); }
    .message.error { background:color-mix(in srgb, #ff4d67 16%, transparent); }
  `;

  private t(key: Parameters<typeof responsiveV2SaveTranslate>[1]): string {
    return responsiveV2SaveTranslate(this.language, key);
  }

  private preview() {
    if (!this.controller || !this.capabilities) return undefined;
    return this.previewSession.preview({
      controller: this.controller,
      capabilities: this.capabilities,
      baseRevision: this.baseRevision,
      hasUnresolvedConflict: this.hasUnresolvedConflict || !!this.conflict,
    });
  }

  private acceptSaved(envelope: ResponsiveCanvasV2RevisionEnvelope): void {
    const controller = this.controller;
    if (!controller) return;
    controller.replaceFromBundle(envelope.bundle);
    this.baseRevision = envelope.revision;
    this.conflict = undefined;
    this.message = 'Saved';
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('frakon-responsive-v2-saved', {
      detail: { envelope, state: responsiveV2SavedState(controller, envelope) },
      bubbles: true,
      composed: true,
    }));
  }

  private async dryRun(): Promise<void> {
    const transport = this.transport;
    const capabilities = this.capabilities;
    const controller = this.controller;
    const preview = this.preview();
    if (this.saving || !transport || !capabilities || !controller || !preview?.hasLocalChanges) return;
    this.saving = true;
    this.message = undefined;
    try {
      const result = await dryRunResponsiveV2EditorCandidate({
        transport,
        capabilities,
        controller,
        baseRevision: this.baseRevision,
        candidate: preview.candidate,
      });
      if (result.status === 'valid') {
        this.message = this.t('validationValid');
      } else if (result.status === 'conflict') {
        this.conflict = result.conflict;
        this.message = this.t('validationConflict');
      } else if (result.status === 'remote-removed') {
        this.message = this.t('validationConflict');
      } else if (result.status === 'clean') {
        this.message = this.t('clean');
      } else {
        this.message = `${this.t('validationBlocked')}: ${result.reason}`;
      }
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
    } finally {
      this.saving = false;
    }
  }

  private async save(event: CustomEvent<{ candidate: ResponsiveCanvasV2RevisionEnvelope }>): Promise<void> {
    event.stopPropagation();
    if (this.saving || !this.transport || !this.capabilities || !this.controller) return;
    this.saving = true;
    this.message = undefined;
    try {
      const result = await saveResponsiveV2EditorCandidate({
        transport: this.transport,
        capabilities: this.capabilities,
        controller: this.controller,
        baseRevision: this.baseRevision,
        candidate: event.detail.candidate,
      });
      if (result.status === 'saved') {
        this.acceptSaved(result.envelope);
      } else if (result.status === 'conflict') {
        this.conflict = result.conflict;
        this.message = undefined;
      } else if (result.status === 'clean') {
        this.message = 'No local changes';
      } else {
        this.message = result.status === 'stale' ? `Save preview is stale: ${result.reason}` : `Save blocked: ${result.reason}`;
      }
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
    } finally {
      this.saving = false;
    }
  }

  private async resolve(event: CustomEvent<{ selections: ResponsiveCanvasV2ConflictSelections }>): Promise<void> {
    event.stopPropagation();
    if (this.saving || !this.transport || !this.capabilities || !this.conflict) return;
    this.saving = true;
    this.message = undefined;
    try {
      const result = await resolveResponsiveV2EditorConflict({
        transport: this.transport,
        capabilities: this.capabilities,
        conflict: this.conflict,
        selections: event.detail.selections,
      });
      if (result.status === 'saved') {
        this.acceptSaved(result.envelope);
      } else if (result.status === 'conflict') {
        this.conflict = result.conflict;
      } else if (result.status === 'incomplete') {
        this.message = `Unresolved breakpoints: ${result.unresolved.join(', ')}`;
      } else {
        this.message = `Save blocked: ${result.reason}`;
      }
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
    } finally {
      this.saving = false;
    }
  }

  render() {
    const preview = this.preview();
    if (!preview) return nothing;
    const dryRunAvailable = preview.hasLocalChanges
      && this.capabilities?.responsiveCanvasV2.dryRunEndpoint !== undefined
      && !this.conflict;
    return html`<div class="stack" aria-busy=${this.saving ? 'true' : 'false'}>
      ${this.conflict
        ? html`<frakon-responsive-v2-conflict-panel .conflict=${this.conflict} .language=${this.language} @frakon-responsive-v2-conflict-resolve=${this.resolve}></frakon-responsive-v2-conflict-panel>`
        : html`<frakon-responsive-v2-save-panel .preview=${preview} .language=${this.language} @frakon-responsive-v2-save-request=${this.save}></frakon-responsive-v2-save-panel>`}
      ${!this.conflict ? html`<div class="actions"><button ?disabled=${this.saving || !dryRunAvailable} @click=${this.dryRun}>${this.t('validateOnServer')}</button></div>` : nothing}
      ${this.message ? html`<div class="message">${this.message}</div>` : nothing}
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-responsive-v2-persistence-action-panel': FrakonResponsiveV2PersistenceActionPanel; } }
