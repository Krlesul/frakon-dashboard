import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  createDashboardEmergencyFocusState,
  dashboardEmergencyFocusIndex,
  dashboardEmergencyFocusSignature,
  nextDashboardEmergencyFocusTarget,
  type DashboardEmergencyFocusState,
} from '../../../src/dashboard/dashboard-emergency-focus';
import {
  acknowledgeDashboardEmergencyHistory,
  dashboardEmergencyDuration,
  updateDashboardEmergencyHistory,
  type DashboardEmergencyHistoryState,
} from '../../../src/dashboard/dashboard-emergency-history';
import { dashboardEmergencyUiStrings } from '../../../src/dashboard/dashboard-emergency-ui-i18n';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../../../src/dashboard/dashboard-intelligence';
import type { DashboardIntelligenceUrgencyDiagnostic } from '../../../src/dashboard/dashboard-intelligence-stabilizer';
import type { DashboardInteractionTracker } from '../../../src/dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import { homeAssistantLanguage, type HomeAssistantLike } from '../../../src/home-assistant/dashboard-intelligence-signal-bridge';
import type { FrakonDashboardIntelligenceContextChangedDetail, FrakonDashboardIntelligenceStabilizationStatusDetail } from './dashboard-intelligence-signal-bridge';
import './dashboard-emergency-focus-bridge';
import './dashboard-intelligence-safe-panel';
import './dashboard-intelligence-signal-bridge';

@customElement('frakon-dashboard-intelligence-live-panel')
export class FrakonDashboardIntelligenceLivePanel extends LitElement {
  @property({ attribute:false }) document?: FrakonDashboardDocument;
  @property({ attribute:false }) hass?: HomeAssistantLike;
  @property({ attribute:false }) tracker?: Pick<DashboardInteractionTracker,'snapshot'>;
  @property() device: DashboardDeviceContext = 'desktop';
  @property({ type:Number }) urgencyConfirmMs = 5_000;
  @property({ type:Number }) urgencyReleaseMs = 15_000;
  @property({ type:Number }) minimumEmissionIntervalMs = 2_000;
  @property({ type:Boolean }) emergencyAutoFocus = true;

  @state() private automaticContext?: DashboardIntelligenceContext;
  @state() private diagnostics: DashboardIntelligenceUrgencyDiagnostic[] = [];
  @state() private nextEvaluationAt?: number;
  @state() private emergencyActiveItemId = '';
  @state() private emergencyFocusToken = 0;
  @state() private emergencyRestoreToken = 0;
  @state() private acknowledgedSignatures: string[] = [];
  @state() private emergencyHistory: DashboardEmergencyHistoryState = { active: [], recent: [] };

  static styles = css`
    :host{display:block}.status{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding:9px 11px;border:1px solid rgb(105 167 255 / 18%);border-radius:10px;background:rgb(105 167 255 / 6%);font:600 11px/1.4 Inter,system-ui,sans-serif}.pill{padding:4px 7px;border-radius:999px;background:rgb(255 255 255 / 7%)}.confirming{color:#9ec8ff}.cooldown{color:#ffc27a}.stable{color:#8be1b4}.critical{color:#ff8f8f;background:rgb(255 91 91 / 12%)}.next{margin-left:auto;opacity:.65;font-weight:500}.emergency-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:-2px 0 10px;padding:10px 11px;border:1px solid rgb(255 91 91 / 32%);border-radius:11px;background:rgb(255 91 91 / 8%);font:600 11px/1.35 Inter,system-ui,sans-serif}.emergency-controls strong{margin-right:auto}.emergency-controls button{border:1px solid rgb(255 255 255 / 14%);border-radius:8px;padding:6px 9px;color:inherit;background:rgb(255 255 255 / 7%);cursor:pointer;font:inherit}.emergency-controls button.primary{border-color:rgb(255 91 91 / 46%);background:rgb(255 91 91 / 14%)}.emergency-controls button.acknowledged{opacity:.65}.emergency-controls button:disabled{opacity:.4;cursor:not-allowed}.history{margin:0 0 10px;padding:10px 11px;border:1px solid rgb(255 255 255 / 10%);border-radius:11px;background:rgb(255 255 255 / 3%);font:500 11px/1.4 Inter,system-ui,sans-serif}.history h4{margin:0 0 8px;font-size:12px}.history-list{display:grid;gap:7px}.history-entry{display:grid;gap:2px;padding:7px 8px;border-radius:8px;background:rgb(255 255 255 / 4%)}.history-entry strong{font-size:11px}.history-entry small{opacity:.68}.history-empty{opacity:.55}
  `;

  private onContextChanged(event: CustomEvent<FrakonDashboardIntelligenceContextChangedDetail>): void {
    this.automaticContext = event.detail.context;
    const focus = this.emergencyFocus(event.detail.context);
    const activeSignatures = new Set(focus.targets.map(dashboardEmergencyFocusSignature));
    this.acknowledgedSignatures = this.acknowledgedSignatures.filter((signature) => activeSignatures.has(signature));
    this.emergencyHistory = updateDashboardEmergencyHistory(this.emergencyHistory, focus, Date.now(), this.acknowledgedSignatures);
    if (!focus.active) { this.emergencyActiveItemId=''; return; }
    if (!focus.targets.some((target)=>target.itemId===this.emergencyActiveItemId)) this.emergencyActiveItemId=focus.primary?.itemId??'';
  }

  private onStabilizationStatus(event: CustomEvent<FrakonDashboardIntelligenceStabilizationStatusDetail>): void { this.diagnostics=event.detail.diagnostics; this.nextEvaluationAt=event.detail.nextEvaluationAt; }
  private emergencyFocus(context=this.automaticContext): DashboardEmergencyFocusState { return this.document?createDashboardEmergencyFocusState(this.document,context):{active:false,targets:[]}; }
  private currentEmergencyItemId(focus:DashboardEmergencyFocusState):string { if(this.emergencyActiveItemId&&focus.targets.some((target)=>target.itemId===this.emergencyActiveItemId))return this.emergencyActiveItemId; return focus.primary?.itemId??''; }
  private currentEmergencyTarget(focus:DashboardEmergencyFocusState){ const id=this.currentEmergencyItemId(focus); return focus.targets.find((target)=>target.itemId===id)??focus.primary; }
  private moveEmergencyFocus(direction:1|-1):void { const focus=this.emergencyFocus(); const target=nextDashboardEmergencyFocusTarget(focus,this.currentEmergencyItemId(focus),direction); if(!target)return; this.emergencyActiveItemId=target.itemId; this.emergencyFocusToken+=1; }
  private restoreEmergencyView():void { this.emergencyRestoreToken+=1; }
  private refocusEmergencyView():void { this.emergencyFocusToken+=1; }
  private acknowledgeEmergency(focus:DashboardEmergencyFocusState):void { const target=this.currentEmergencyTarget(focus); if(!target)return; const signature=dashboardEmergencyFocusSignature(target); if(!this.acknowledgedSignatures.includes(signature)) this.acknowledgedSignatures=[...this.acknowledgedSignatures,signature]; this.emergencyHistory=acknowledgeDashboardEmergencyHistory(this.emergencyHistory,signature,Date.now()); }

  private renderStatus(){ const strings=dashboardEmergencyUiStrings(homeAssistantLanguage(this.hass)); const confirming=this.diagnostics.filter((d)=>d.phase==='confirming').length; const cooldown=this.diagnostics.filter((d)=>d.phase==='cooldown').length; const stableUrgent=this.diagnostics.filter((d)=>d.phase==='stable'&&d.stableUrgent).length; const critical=this.diagnostics.filter((d)=>d.stableUrgent&&d.severity==='critical').length; if(confirming===0&&cooldown===0&&stableUrgent===0)return nothing; const nextSeconds=this.nextEvaluationAt===undefined?undefined:Math.max(0,Math.ceil((this.nextEvaluationAt-Date.now())/1000)); return html`<div class="status" aria-live="polite">${critical>0?html`<span class="pill critical">${critical} ${strings.critical} · ${strings.emergencyFocusActive}</span>`:nothing}${stableUrgent>0?html`<span class="pill stable">${stableUrgent} ${strings.urgent}</span>`:nothing}${confirming>0?html`<span class="pill confirming">${confirming} ${strings.confirming}</span>`:nothing}${cooldown>0?html`<span class="pill cooldown">${cooldown} ${strings.coolingDown}</span>`:nothing}${nextSeconds!==undefined?html`<span class="next">${strings.nextCheckIn(nextSeconds)}</span>`:nothing}</div>`; }

  private renderEmergencyControls(focus:DashboardEmergencyFocusState){ if(!focus.active)return nothing; const strings=dashboardEmergencyUiStrings(homeAssistantLanguage(this.hass)); const currentId=this.currentEmergencyItemId(focus); const index=dashboardEmergencyFocusIndex(focus,currentId); const target=this.currentEmergencyTarget(focus); const acknowledged=target?this.acknowledgedSignatures.includes(dashboardEmergencyFocusSignature(target)):false; return html`<div class="emergency-controls" role="group" aria-label=${strings.navigationLabel}><strong>${strings.criticalPosition(Math.max(0,index)+1,focus.targets.length,currentId)}</strong><button ?disabled=${focus.targets.length<=1} @click=${()=>this.moveEmergencyFocus(-1)}>${strings.previous}</button><button ?disabled=${focus.targets.length<=1} @click=${()=>this.moveEmergencyFocus(1)}>${strings.next}</button><button @click=${this.restoreEmergencyView}>${strings.returnToPreviousView}</button><button class="primary" @click=${this.refocusEmergencyView}>${strings.focusAgain}</button><button class=${acknowledged?'acknowledged':''} ?disabled=${acknowledged} @click=${()=>this.acknowledgeEmergency(focus)}>${acknowledged?strings.acknowledged:strings.acknowledge}</button></div>`; }

  private renderEmergencyHistory(){ const locale=homeAssistantLanguage(this.hass); const strings=dashboardEmergencyUiStrings(locale); const formatter=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit'}); const formatDuration=(ms:number)=>{const total=Math.max(0,Math.round(ms/1000));const minutes=Math.floor(total/60);const seconds=total%60;return minutes>0?`${minutes}m ${seconds}s`:`${seconds}s`;}; const active=this.emergencyHistory.active; const recent=this.emergencyHistory.recent.slice(0,5); if(active.length===0&&recent.length===0)return nothing; return html`<section class="history"><h4>${strings.history}</h4><div class="history-list">${active.map((entry)=>html`<div class="history-entry"><strong>${entry.itemId}</strong><small>${strings.activeSince}: ${formatter.format(entry.startedAt)} · ${strings.duration}: ${formatDuration(dashboardEmergencyDuration(entry))}</small>${entry.acknowledgedAt!==undefined?html`<small>${strings.acknowledgedAt}: ${formatter.format(entry.acknowledgedAt)}</small>`:nothing}</div>`)}${recent.length>0?html`<small>${strings.recentEvents}</small>`:html`<small class="history-empty">${strings.noRecentEvents}</small>`}${recent.map((entry)=>html`<div class="history-entry"><strong>${entry.itemId}</strong><small>${strings.endedAt}: ${formatter.format(entry.endedAt!)} · ${strings.duration}: ${formatDuration(entry.durationMs??0)}</small>${entry.acknowledgedAt!==undefined?html`<small>${strings.acknowledgedAt}: ${formatter.format(entry.acknowledgedAt)}</small>`:nothing}</div>`)}</div></section>`; }

  render(){ const emergencyFocus=this.emergencyFocus(); const emergencyItemId=this.currentEmergencyItemId(emergencyFocus); const locale=homeAssistantLanguage(this.hass); return html`<frakon-dashboard-intelligence-signal-bridge .hass=${this.hass} .document=${this.document} .tracker=${this.tracker} .device=${this.device} .urgencyConfirmMs=${this.urgencyConfirmMs} .urgencyReleaseMs=${this.urgencyReleaseMs} .minimumEmissionIntervalMs=${this.minimumEmissionIntervalMs} @frakon-dashboard-intelligence-context-changed=${this.onContextChanged} @frakon-dashboard-intelligence-stabilization-status=${this.onStabilizationStatus}></frakon-dashboard-intelligence-signal-bridge><frakon-dashboard-emergency-focus-bridge .focusState=${emergencyFocus} .document=${this.document} .autoFocus=${this.emergencyAutoFocus} .activeItemId=${emergencyItemId} .locale=${locale} .acknowledgedSignatures=${this.acknowledgedSignatures} .focusToken=${this.emergencyFocusToken} .restoreToken=${this.emergencyRestoreToken}></frakon-dashboard-emergency-focus-bridge>${this.renderStatus()}${this.renderEmergencyControls(emergencyFocus)}${this.renderEmergencyHistory()}<frakon-dashboard-intelligence-safe-panel .document=${this.document} .automaticContext=${this.automaticContext}></frakon-dashboard-intelligence-safe-panel>`; }
}

declare global{interface HTMLElementTagNameMap{'frakon-dashboard-intelligence-live-panel':FrakonDashboardIntelligenceLivePanel}}
