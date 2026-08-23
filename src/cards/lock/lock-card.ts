import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';
import { resolveLanguage } from '../../i18n';
import { frakonLockStateLabel, frakonLockTranslate } from './lock-card-i18n';
import { frakonLockUnlockIntent } from './lock-card-safety';
import { frakonLockActionForState } from './lock-card-state';

export interface FrakonLockCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-lock-card';
  entity: string;
  show_state?: boolean;
  confirm_unlock?: boolean;
}

@customElement('frakon-lock-card')
export class FrakonLockCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonLockCardConfig;
  @state() private unlockArmed = false;

  private unlockTimer?: number;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:150px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:18px}
    .name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65}.actions{display:flex;gap:8px;flex-wrap:wrap}button{min-width:92px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer;font:inherit;font-weight:650}.primary{background:color-mix(in srgb,var(--frakon-accent) 28%,transparent)}.confirm{background:color-mix(in srgb,#f0a85a 28%,transparent)}button:disabled{opacity:.42;cursor:not-allowed}
  `;

  setConfig(config: FrakonLockCardConfig): void {
    if (!config.entity?.startsWith('lock.')) throw new Error('FRAKON Lock Card requires a lock entity.');
    this.clearUnlockConfirmation();
    this.config = { show_state: true, confirm_unlock: true, ...config };
  }

  disconnectedCallback(): void {
    this.clearUnlockConfirmation();
    super.disconnectedCallback();
  }

  getCardSize(): number { return 3; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-lock-card-editor'); }
  static getStubConfig(): FrakonLockCardConfig {
    return { type: 'custom:frakon-lock-card', entity: 'lock.example', show_state: true, confirm_unlock: true };
  }

  private clearUnlockConfirmation(): void {
    this.unlockArmed = false;
    if (this.unlockTimer !== undefined && typeof window !== 'undefined') window.clearTimeout(this.unlockTimer);
    this.unlockTimer = undefined;
  }

  private armUnlockConfirmation(): void {
    this.clearUnlockConfirmation();
    this.unlockArmed = true;
    if (typeof window !== 'undefined') {
      this.unlockTimer = window.setTimeout(() => {
        this.unlockArmed = false;
        this.unlockTimer = undefined;
      }, 5000);
    }
  }

  private lock(state: string): void {
    if (!this.hass || !this.config || frakonLockActionForState(state) !== 'lock') return;
    this.clearUnlockConfirmation();
    void this.hass.callService('lock', 'lock', { entity_id: this.config.entity });
  }

  private unlock(state: string): void {
    if (!this.hass || !this.config || frakonLockActionForState(state) !== 'unlock') return;
    const intent = frakonLockUnlockIntent(this.config.confirm_unlock, this.unlockArmed);
    if (intent === 'confirm') {
      this.armUnlockConfirmation();
      return;
    }
    this.clearUnlockConfirmation();
    void this.hass.callService('lock', 'unlock', { entity_id: this.config.entity });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const language = resolveLanguage(this.config.language, this.hass.locale?.language, this.hass.language, navigator.language);
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">${frakonLockTranslate(language, 'entityMissing')}</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const action = frakonLockActionForState(entity.state);
    const locked = entity.state === 'locked';
    const stateLabel = frakonLockStateLabel(language, entity.state);
    const unlockLabel = this.unlockArmed && this.config.confirm_unlock !== false
      ? frakonLockTranslate(language, 'confirmUnlock')
      : frakonLockTranslate(language, 'unlock');
    return html`<article class="card">
      <div><div class="name">${name}</div>${this.config.show_state ? html`<div class="state">${stateLabel}</div>` : nothing}</div>
      <div class="actions">
        <button class=${!locked ? 'primary' : ''} ?disabled=${action !== 'lock'} @click=${() => this.lock(entity.state)}>${frakonLockTranslate(language, 'lock')}</button>
        <button class=${this.unlockArmed ? 'confirm' : locked ? 'primary' : ''} ?disabled=${action !== 'unlock'} @click=${() => this.unlock(entity.state)}>${unlockLabel}</button>
      </div>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-lock-card': FrakonLockCard; } }
