import { LitElement,css,html,nothing } from 'lit';
import { customElement,property } from 'lit/decorators.js';
import type { DashboardEmergencyExecutionSession } from '../../../src/dashboard/dashboard-emergency-execution-session';
export interface FrakonDashboardEmergencyConfirmationDetail{confirmed:boolean}
@customElement('frakon-dashboard-emergency-confirmation-dialog')
export class FrakonDashboardEmergencyConfirmationDialog extends LitElement{
 @property({attribute:false}) session?:DashboardEmergencyExecutionSession;
 @property() locale='en';
 static styles=css`:host{display:block}.dialog{margin:10px 0;padding:14px;border:1px solid rgb(255 100 100 / 45%);border-radius:12px;background:rgb(255 70 70 / 8%)}.title{font-weight:800;margin-bottom:6px}.text{opacity:.9;margin-bottom:12px}.actions{display:flex;gap:8px;flex-wrap:wrap}button{padding:8px 12px;border-radius:8px;border:1px solid rgb(255 255 255 / 18%);cursor:pointer}.confirm{font-weight:800;background:rgb(255 80 80 / 20%)}`;
 private emit(confirmed:boolean){this.dispatchEvent(new CustomEvent<FrakonDashboardEmergencyConfirmationDetail>('frakon-dashboard-emergency-confirmation',{detail:{confirmed},bubbles:true,composed:true}));}
 render(){if(!this.session)return nothing;const cs=this.locale.toLowerCase().startsWith('cs'),plan=this.session.plan;return html`<section class="dialog" role="alertdialog" aria-modal="true"><div class="title">${cs?'Potvrzení nouzové akce':'Confirm emergency action'}</div><div class="text">${plan.confirmationText??plan.policy.reason}</div><div class="actions"><button class="confirm" @click=${()=>this.emit(true)}>${cs?'Potvrdit a provést':'Confirm and execute'}</button><button @click=${()=>this.emit(false)}>${cs?'Zrušit':'Cancel'}</button></div></section>`;}
}
declare global{interface HTMLElementTagNameMap{'frakon-dashboard-emergency-confirmation-dialog':FrakonDashboardEmergencyConfirmationDialog}}
