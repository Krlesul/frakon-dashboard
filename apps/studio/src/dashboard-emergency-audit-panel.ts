import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DashboardEmergencyHistoryState } from '../../../src/dashboard/dashboard-emergency-history';
import { filterDashboardEmergencyHistory, serializeDashboardEmergencyHistoryExport, type DashboardEmergencyAcknowledgementFilter } from '../../../src/dashboard/dashboard-emergency-history-tools';
import { emergencyKind, type DashboardEmergencyKind } from '../../../src/dashboard/dashboard-emergency-presentation';

const KINDS: Array<DashboardEmergencyKind | 'all'> = ['all','smoke','gas','water','safety','alarm','battery','climate','unavailable','generic'];

@customElement('frakon-dashboard-emergency-audit-panel')
export class FrakonDashboardEmergencyAuditPanel extends LitElement {
  @property({ attribute:false }) history: DashboardEmergencyHistoryState = { active:[], recent:[] };
  @property() locale = 'en';
  @state() private kind: DashboardEmergencyKind | 'all' = 'all';
  @state() private acknowledgement: DashboardEmergencyAcknowledgementFilter = 'all';
  @state() private fromDate = '';
  @state() private toDate = '';
  @state() private confirmClear = false;

  static styles = css`
    :host{display:block;margin:0 0 10px}.panel{padding:10px 11px;border:1px solid rgb(255 255 255 / 10%);border-radius:11px;background:rgb(255 255 255 / 3%);font:500 11px/1.4 Inter,system-ui,sans-serif}.toolbar,.filters{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.filters{margin-bottom:8px}.panel button,.panel select,.panel input{border:1px solid rgb(255 255 255 / 14%);border-radius:8px;padding:6px 8px;color:inherit;background:rgb(255 255 255 / 6%);font:inherit}.panel button{cursor:pointer}.panel button.danger{border-color:rgb(255 91 91 / 36%)}.summary{margin:7px 0;opacity:.7}.confirm{margin-top:8px;padding:8px;border-radius:8px;background:rgb(255 91 91 / 8%)}
  `;

  private strings(){ const l=this.locale.toLowerCase().split(/[-_]/)[0]; return l==='cs'?{title:'Audit kritických událostí',all:'Vše',ack:'Potvrzené',unack:'Nepotvrzené',from:'Od',to:'Do',export:'Export JSON',clear:'Vymazat historii',confirm:'Opravdu vymazat uloženou historii kritických událostí?',yes:'Ano, vymazat',cancel:'Zrušit',shown:'Zobrazeno'}:{title:'Critical event audit',all:'All',ack:'Acknowledged',unack:'Unacknowledged',from:'From',to:'To',export:'Export JSON',clear:'Clear history',confirm:'Really clear stored critical event history?',yes:'Yes, clear',cancel:'Cancel',shown:'Shown'}; }

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

  private requestClear():void{
    this.dispatchEvent(new CustomEvent('frakon-dashboard-emergency-history-clear',{bubbles:true,composed:true}));
    this.confirmClear=false;
  }

  render(){
    const s=this.strings(); const filtered=this.filtered(); const total=filtered.active.length+filtered.recent.length;
    return html`<section class="panel"><strong>${s.title}</strong><div class="filters">
      <select @change=${(e:Event)=>this.kind=(e.currentTarget as HTMLSelectElement).value as DashboardEmergencyKind|'all'}>${KINDS.map((kind)=>html`<option value=${kind}>${kind==='all'?s.all:kind}</option>`)}</select>
      <select @change=${(e:Event)=>this.acknowledgement=(e.currentTarget as HTMLSelectElement).value as DashboardEmergencyAcknowledgementFilter}><option value="all">${s.all}</option><option value="acknowledged">${s.ack}</option><option value="unacknowledged">${s.unack}</option></select>
      <label>${s.from} <input type="date" .value=${this.fromDate} @change=${(e:Event)=>this.fromDate=(e.currentTarget as HTMLInputElement).value}></label>
      <label>${s.to} <input type="date" .value=${this.toDate} @change=${(e:Event)=>this.toDate=(e.currentTarget as HTMLInputElement).value}></label>
    </div><div class="summary">${s.shown}: ${total}</div><div class="toolbar"><button @click=${this.exportJson}>${s.export}</button><button class="danger" @click=${()=>this.confirmClear=true}>${s.clear}</button></div>${this.confirmClear?html`<div class="confirm">${s.confirm}<div class="toolbar"><button class="danger" @click=${this.requestClear}>${s.yes}</button><button @click=${()=>this.confirmClear=false}>${s.cancel}</button></div></div>`:nothing}</section>`;
  }
}

declare global{interface HTMLElementTagNameMap{'frakon-dashboard-emergency-audit-panel':FrakonDashboardEmergencyAuditPanel}}
