import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { dashboardEmergencyFocusSignature, type DashboardEmergencyFocusState } from '../../../src/dashboard/dashboard-emergency-focus';
import { presentDashboardEmergency } from '../../../src/dashboard/dashboard-emergency-presentation';
import { dashboardEmergencyUiStrings } from '../../../src/dashboard/dashboard-emergency-ui-i18n';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-emergency-focus-overlay')
export class FrakonDashboardEmergencyFocusOverlay extends LitElement {
  @property({ attribute: false }) focusState?: DashboardEmergencyFocusState;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) acknowledgedSignatures: string[] = [];
  @property() activeItemId = '';
  @property() locale = 'en';

  static styles = css`
    :host { position:absolute; inset:0; z-index:30; display:block; pointer-events:none; }
    .veil { position:absolute; inset:0; background:rgb(5 7 12 / 52%); backdrop-filter:blur(1px); }
    .focus { --tone:255 78 91; position:absolute; box-sizing:border-box; border:3px solid rgb(var(--tone) / 96%); border-radius:14px; background:rgb(var(--tone) / 8%); box-shadow:0 0 0 7px rgb(var(--tone) / 16%),0 0 42px rgb(var(--tone) / 48%); animation:pulse 1.25s ease-in-out infinite alternate; transition:opacity 140ms ease,filter 140ms ease,box-shadow 140ms ease; }
    .focus.smoke { --tone:255 92 92; } .focus.gas { --tone:255 170 72; } .focus.water { --tone:74 165 255; } .focus.safety { --tone:255 196 74; } .focus.alarm { --tone:255 62 120; } .focus.battery { --tone:255 145 64; } .focus.climate { --tone:193 105 255; } .focus.unavailable { --tone:166 176 190; }
    .focus.acknowledged { animation:none; filter:saturate(.72); opacity:.7; box-shadow:0 0 0 4px rgb(var(--tone) / 14%),0 0 22px rgb(var(--tone) / 28%); }
    .label { position:absolute; left:8px; top:8px; display:grid; grid-template-columns:auto minmax(0,1fr); gap:3px 7px; align-items:center; max-width:min(440px,calc(100% - 16px)); padding:8px 10px; border-radius:8px; color:white; background:rgb(var(--tone) / 90%); font:700 10px/1.25 Inter,system-ui,sans-serif; }
    .icon { grid-row:1 / span 5; display:grid; place-items:center; width:24px; height:24px; border-radius:7px; background:rgb(0 0 0 / 20%); font-size:16px; font-weight:900; }
    .label strong { font-weight:900; letter-spacing:.03em; } .label .source { font-size:11px; opacity:.94; } .label .guidance { margin-top:2px; font:600 10px/1.35 Inter,system-ui,sans-serif; opacity:.9; } .label .technical { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.62; font:500 9px/1.25 ui-monospace,SFMono-Regular,monospace; } .label .ack { font:700 9px/1.2 Inter,system-ui,sans-serif; opacity:.78; }
    .focus.active:not(.acknowledged) { z-index:2; box-shadow:0 0 0 8px rgb(var(--tone) / 22%),0 0 54px rgb(var(--tone) / 64%); filter:brightness(1.16); } .focus.muted { opacity:.38; animation:none; }
    @keyframes pulse { from { filter:brightness(1); } to { filter:brightness(1.22); } } @media (prefers-reduced-motion:reduce) { .focus { animation:none; } }
  `;

  render() {
    if (!this.focusState?.active || !this.document) return nothing;
    const activeItemId = this.activeItemId || this.focusState.primary?.itemId || '';
    const strings = dashboardEmergencyUiStrings(this.locale);
    const acknowledged = new Set(this.acknowledgedSignatures);
    return html`<div class="veil"></div>${this.focusState.targets.map((target) => {
      const item = target.item; const active = target.itemId === activeItemId; const presentation = presentDashboardEmergency(target, this.locale); const isAcknowledged = acknowledged.has(dashboardEmergencyFocusSignature(target));
      const style = `left:${item.x * COLUMN_WIDTH}px;top:${item.y * this.document!.rowHeight}px;width:${item.w * COLUMN_WIDTH - this.document!.gap}px;height:${item.h * this.document!.rowHeight - this.document!.gap}px`;
      return html`<div class=${`focus ${presentation.kind} ${active ? 'active' : 'muted'} ${isAcknowledged ? 'acknowledged' : ''}`} style=${style}><div class="label"><span class="icon">${presentation.icon}</span><strong>${strings.critical.toUpperCase()} · ${presentation.title}</strong>${presentation.sourceLabel ? html`<span class="source">${presentation.sourceLabel}</span>` : nothing}<span class="guidance">${presentation.guidance}</span>${isAcknowledged ? html`<span class="ack">${strings.acknowledged}</span>` : nothing}${presentation.sourceEntityId ? html`<span class="technical">${presentation.sourceEntityId}</span>` : nothing}</div></div>`;
    })}`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-emergency-focus-overlay': FrakonDashboardEmergencyFocusOverlay; } }
