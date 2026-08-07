import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardEmergencyHistoryState } from '../../../src/dashboard/dashboard-emergency-history';
import {
  buildDashboardEmergencyTimeline,
  calculateDashboardEmergencyHistoryStats,
  calculateDashboardEmergencyHistoryTrend,
  calculateDashboardEmergencyKindBreakdown,
  filterDashboardEmergencyHistory,
  parseDashboardEmergencyHistoryImport,
  serializeDashboardEmergencyHistoryExport,
  type DashboardEmergencyAcknowledgementFilter,
  type DashboardEmergencyHistoryImportResult,
  type DashboardEmergencyHistoryTrend,
} from '../../../src/dashboard/dashboard-emergency-history-tools';
import type { DashboardEmergencyKind } from '../../../src/dashboard/dashboard-emergency-presentation';

const KINDS: Array<DashboardEmergencyKind | 'all'> = ['all','smoke','gas','water','safety','alarm','battery','climate','unavailable','generic'];

export interface FrakonDashboardEmergencyHistoryImportDetail {
  history: DashboardEmergencyHistoryState;
  importedRecent: number;
}

@customElement('frakon-dashboard-emergency-audit-panel')
export class FrakonDashboardEmergencyAuditPanel extends LitElement {
  @property({ attribute:false }) history: DashboardEmergencyHistoryState = { active:[], recent:[] };
  @property() locale = 'en';
  @property({ type:Number }) recentLimit = 100;
  @state() private kind: DashboardEmergencyKind | 'all' = 'all';
  @state() private acknowledgement: DashboardEmergencyAcknowledgementFilter = 'all';
  @state() private fromDate = '';
  @state() private toDate = '';
  @state() private confirmClear = false;
  @state() private importStatus: 'idle' | 'success' | 'invalid-json' | 'invalid-format' | 'unsupported-version' = 'idle';
  @state() private importedCount = 0;

  static styles = css`
    :host{display:block;margin:0 0 10px}.panel{padding:10px 11px;border:1px solid rgb(255 255 255 / 10%);border-radius:11px;background:rgb(255 255 255 / 3%);font:500 11px/1.4 Inter,system-ui,sans-serif}.toolbar,.filters{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.filters{margin-bottom:8px}.panel button,.panel select,.panel input{border:1px solid rgb(255 255 255 / 14%);border-radius:8px;padding:6px 8px;color:inherit;background:rgb(255 255 255 / 6%);font:inherit}.panel button{cursor:pointer}.panel button.danger{border-color:rgb(255 91 91 / 36%)}.summary{margin:7px 0;opacity:.7}.stats,.trends{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px;margin:8px 0}.stat,.trend{padding:8px;border-radius:9px;background:rgb(255 255 255 / 4%)}.stat strong,.trend strong{display:block;font-size:15px}.stat span,.trend span{opacity:.62}.trend.improving{border:1px solid rgb(74 210 135 / 24%)}.trend.worsening{border:1px solid rgb(255 91 91 / 26%)}.trend.stable{border:1px solid rgb(255 255 255 / 10%)}.section-title{margin:10px 0 6px;font-weight:700}.breakdown{display:grid;gap:6px}.breakdown-row{display:grid;grid-template-columns:minmax(72px,110px) 1fr auto;gap:8px;align-items:center}.breakdown-track{height:7px;border-radius:999px;background:rgb(255 255 255 / 7%);overflow:hidden}.breakdown-fill{height:100%;border-radius:inherit;background:currentColor;opacity:.72}.timeline{display:grid;grid-template-columns:repeat(30,minmax(3px,1fr));gap:2px;height:64px;align-items:end;margin:7px 0 3px;padding:6px;border-radius:9px;background:rgb(255 255 255 / 3%)}.timeline-bar{min-height:2px;border-radius:3px 3px 1px 1px;background:currentColor;opacity:.68}.timeline-labels{display:flex;justify-content:space-between;opacity:.55;font-size:10px}.confirm{margin-top:8px;padding:8px;border-radius:8px;background:rgb(255 91 91 / 8%)}.import-status{margin-top:7px;opacity:.78}.file-input{display:none}
  `;

  private strings(){ const l=this.locale.toLowerCase().split(/[-_]/)[0]; return l==='cs'?{title:'Audit kritických událostí',all:'Vše',ack:'Potvrzené',unack:'Nepotvrzené',from:'Od',to:'Do',export:'Export JSON',import:'Import JSON',clear:'Vymazat historii',confirm:'Opravdu vymazat uloženou historii kritických událostí?',yes:'Ano, vymazat',cancel:'Zrušit',shown:'Zobrazeno',events:'Události',mostFrequent:'Nejčastější typ',avgDuration:'Průměrná délka',avgAck:'Průměr do potvrzení',ackRate:'Míra potvrzení',trend7:'Trend 7 dní',trend30:'Trend 30 dní',improving:'Zlepšení',stable:'Beze změny',worsening:'Zhoršení',previous:'předchozí',breakdown:'Rozdělení podle typu',timeline:'Časová osa · 30 dní',daysAgo:'před 30 dny',today:'dnes',none:'—',imported:(n:number)=>`Importováno ${n} historických událostí`,invalidJson:'Soubor není platný JSON.',invalidFormat:'Soubor není audit log FRAKON Dashboardu.',unsupported:'Tato verze audit logu není podporována.'}:{title:'Critical event audit',all:'All',ack:'Acknowledged',unack:'Unacknowledged',from:'From',to:'To',export:'Export JSON',import:'Import JSON',clear:'Clear history',confirm:'Really clear stored critical event history?',yes:'Yes, clear',cancel:'Cancel',shown:'Shown',events:'Events',mostFrequent:'Most frequent type',avgDuration:'Average duration',avgAck:'Average acknowledgement',ackRate:'Acknowledgement rate',trend7:'7-day trend',trend30:'30-day trend',improving:'Improving',stable:'Stable',worsening:'Worsening',previous:'previous',breakdown:'Breakdown by type',timeline:'Timeline · 30 days',daysAgo:'30 days ago',today:'today',none:'—',imported:(n:number)=>`Imported ${n} historical events`,invalidJson:'The file is not valid JSON.',invalidFormat:'The file is not a FRAKON Dashboard audit log.',unsupported:'This audit log version is not supported.'}; }

  private filtered(){
    const from=this.fromDate?new Date(`${this.fromDate}T00:00:00`).getTime():undefined;
    const to=this.toDate?new Date(`${this.toDate}T23:59:59.999`).getTime():undefined;
    return filterDashboardEmergencyHistory(this.history,{kind:this.kind,acknowledgement:this.acknowledgement,from:Number.isFinite(from)?from:undefined,to:Number.isFinite(to)?to:undefined});
  }

  private exportJson():void{
    const payload=serializeDashboardEmergencyHistoryExport(this.filtered());
    const blob=new Blob([payload],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url; anchor.download=`frakon-emergency-audit-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    anchor.click(); URL.revokeObjectURL(url);
  }

  private openImport(): void {
    this.renderRoot.querySelector<HTMLInputElement>('.file-input')?.click();
  }

  private async importJson(event: Event): Promise<void> {
    const input=event.currentTarget as HTMLInputElement;
    const file=input.files?.[0];
    input.value='';
    if(!file)return;
    let raw='';
    try { raw=await file.text(); }
    catch { this.importStatus='invalid-json'; return; }
    const result:DashboardEmergencyHistoryImportResult=parseDashboardEmergencyHistoryImport(raw,this.history,this.recentLimit);
    if(!result.ok){ this.importStatus=result.error; return; }
    this.importStatus='success'; this.importedCount=result.importedRecent;
    this.dispatchEvent(new CustomEvent<FrakonDashboardEmergencyHistoryImportDetail>('frakon-dashboard-emergency-history-import',{detail:{history:result.history,importedRecent:result.importedRecent},bubbles:true,composed:true}));
  }

  private requestClear():void{
    this.dispatchEvent(new CustomEvent('frakon-dashboard-emergency-history-clear',{bubbles:true,composed:true}));
    this.confirmClear=false; this.importStatus='idle'; this.importedCount=0;
  }

  private renderImportStatus(){ const s=this.strings(); if(this.importStatus==='idle')return nothing; if(this.importStatus==='success')return html`<div class="import-status">${s.imported(this.importedCount)}</div>`; if(this.importStatus==='invalid-json')return html`<div class="import-status">${s.invalidJson}</div>`; if(this.importStatus==='invalid-format')return html`<div class="import-status">${s.invalidFormat}</div>`; return html`<div class="import-status">${s.unsupported}</div>`; }

  private formatDuration(ms: number | undefined): string {
    if(ms===undefined)return this.strings().none;
    const total=Math.max(0,Math.round(ms/1000));
    const minutes=Math.floor(total/60); const seconds=total%60;
    return minutes>0?`${minutes}m ${seconds}s`:`${seconds}s`;
  }

  private trendText(trend: DashboardEmergencyHistoryTrend): string {
    const s=this.strings();
    const direction=trend.direction==='improving'?s.improving:trend.direction==='worsening'?s.worsening:s.stable;
    const rate=trend.changeRate===undefined?'':` · ${trend.changeRate>=0?'+':''}${Math.round(trend.changeRate*100)}%`;
    return `${direction}${rate} · ${trend.currentCount} / ${trend.previousCount} ${s.previous}`;
  }

  render(){
    const s=this.strings(); const filtered=this.filtered(); const stats=calculateDashboardEmergencyHistoryStats(filtered); const total=stats.totalEvents; const trend7=calculateDashboardEmergencyHistoryTrend(filtered,7); const trend30=calculateDashboardEmergencyHistoryTrend(filtered,30); const breakdown=calculateDashboardEmergencyKindBreakdown(filtered); const timeline=buildDashboardEmergencyTimeline(filtered,30); const maxTimeline=Math.max(1,...timeline.map((bucket)=>bucket.count));
    return html`<section class="panel"><strong>${s.title}</strong><div class="filters">
      <select @change=${(e:Event)=>this.kind=(e.currentTarget as HTMLSelectElement).value as DashboardEmergencyKind|'all'}>${KINDS.map((kind)=>html`<option value=${kind}>${kind==='all'?s.all:kind}</option>`)}</select>
      <select @change=${(e:Event)=>this.acknowledgement=(e.currentTarget as HTMLSelectElement).value as DashboardEmergencyAcknowledgementFilter}><option value="all">${s.all}</option><option value="acknowledged">${s.ack}</option><option value="unacknowledged">${s.unack}</option></select>
      <label>${s.from} <input type="date" .value=${this.fromDate} @change=${(e:Event)=>this.fromDate=(e.currentTarget as HTMLInputElement).value}></label>
      <label>${s.to} <input type="date" .value=${this.toDate} @change=${(e:Event)=>this.toDate=(e.currentTarget as HTMLInputElement).value}></label>
    </div><div class="summary">${s.shown}: ${total}</div><div class="stats"><div class="stat"><strong>${stats.totalEvents}</strong><span>${s.events}</span></div><div class="stat"><strong>${stats.mostFrequentKind??s.none}${stats.mostFrequentKind?` · ${stats.mostFrequentKindCount}`:''}</strong><span>${s.mostFrequent}</span></div><div class="stat"><strong>${this.formatDuration(stats.averageDurationMs)}</strong><span>${s.avgDuration}</span></div><div class="stat"><strong>${this.formatDuration(stats.averageAcknowledgementMs)}</strong><span>${s.avgAck}</span></div><div class="stat"><strong>${Math.round(stats.acknowledgementRate*100)}%</strong><span>${s.ackRate}</span></div></div><div class="trends"><div class=${`trend ${trend7.direction}`}><strong>${this.trendText(trend7)}</strong><span>${s.trend7}</span></div><div class=${`trend ${trend30.direction}`}><strong>${this.trendText(trend30)}</strong><span>${s.trend30}</span></div></div>${breakdown.length>0?html`<div class="section-title">${s.breakdown}</div><div class="breakdown">${breakdown.map((entry)=>html`<div class="breakdown-row"><span>${entry.kind}</span><div class="breakdown-track"><div class="breakdown-fill" style=${`width:${Math.round(entry.share*100)}%`}></div></div><strong>${entry.count} · ${Math.round(entry.share*100)}%</strong></div>`)}</div>`:nothing}<div class="section-title">${s.timeline}</div><div class="timeline" aria-label=${s.timeline}>${timeline.map((bucket)=>html`<div class="timeline-bar" title=${`${new Date(bucket.startAt).toLocaleDateString(this.locale)} · ${bucket.count}`} style=${`height:${Math.max(2,Math.round(bucket.count/maxTimeline*100))}%`}></div>`)}</div><div class="timeline-labels"><span>${s.daysAgo}</span><span>${s.today}</span></div><div class="toolbar"><button @click=${this.exportJson}>${s.export}</button><button @click=${this.openImport}>${s.import}</button><input class="file-input" type="file" accept="application/json,.json" @change=${this.importJson}><button class="danger" @click=${()=>this.confirmClear=true}>${s.clear}</button></div>${this.renderImportStatus()}${this.confirmClear?html`<div class="confirm">${s.confirm}<div class="toolbar"><button class="danger" @click=${this.requestClear}>${s.yes}</button><button @click=${()=>this.confirmClear=false}>${s.cancel}</button></div></div>`:nothing}</section>`;
  }
}

declare global{interface HTMLElementTagNameMap{'frakon-dashboard-emergency-audit-panel':FrakonDashboardEmergencyAuditPanel}}
