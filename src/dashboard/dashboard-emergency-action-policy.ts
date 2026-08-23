import type { DashboardEmergencyActionKind } from './dashboard-emergency-actions';

export type DashboardEmergencyActionPolicyLevel='read-only'|'safe-automatic'|'confirmation-required'|'forbidden';
export interface DashboardEmergencyExecutableAction { kind:string; entityId?:string; domain?:string; service?:string; }
export interface DashboardEmergencyActionPolicyContext { emergencyKind?:string; active:boolean; acknowledged:boolean; explicitUserRequest?:boolean; }
export interface DashboardEmergencyActionPolicyDecision { level:DashboardEmergencyActionPolicyLevel; allowed:boolean; requiresConfirmation:boolean; reason:string; }

const READ_ONLY=new Set<DashboardEmergencyActionKind>(['open-source','locate-card','focus-card','inspect-cameras','inspect-entry-points','inspect-connectivity','inspect-climate','inspect-battery','find-water-shutoff']);
const FORBIDDEN_SERVICES=new Set(['lock.unlock','cover.open_cover','cover.open','alarm_control_panel.alarm_disarm']);
const CONFIRM_SERVICES=new Set(['valve.close_valve','valve.close','switch.turn_off','climate.turn_off','lock.lock','cover.close_cover','cover.close','alarm_control_panel.alarm_arm_away','alarm_control_panel.alarm_arm_home']);

export function evaluateDashboardEmergencyActionPolicy(action:DashboardEmergencyExecutableAction,context:DashboardEmergencyActionPolicyContext):DashboardEmergencyActionPolicyDecision{
 if(READ_ONLY.has(action.kind as DashboardEmergencyActionKind))return decision('read-only',true,false,'Navigation and inspection actions do not change Home Assistant state.');
 const service=normalizedService(action);
 if(FORBIDDEN_SERVICES.has(service))return decision('forbidden',false,false,'Emergency mode must not reduce physical security or disarm protection.');
 if(!context.active)return decision('forbidden',false,false,'State-changing emergency actions are disabled for historical events.');
 if(CONFIRM_SERVICES.has(service))return decision('confirmation-required',true,true,'This action changes a physical or safety-relevant Home Assistant state.');
 if(isSafeAutomatic(service,context))return decision('safe-automatic',true,false,'Policy permits this narrowly scoped protective action while the emergency is active.');
 return decision('confirmation-required',true,true,'Unknown state-changing actions require explicit confirmation.');
}

function isSafeAutomatic(service:string,context:DashboardEmergencyActionPolicyContext):boolean{
 if(context.explicitUserRequest)return false;
 if(context.emergencyKind==='water'&&(service==='notify.notify'||service==='persistent_notification.create'))return true;
 if((context.emergencyKind==='smoke'||context.emergencyKind==='gas')&&(service==='notify.notify'||service==='persistent_notification.create'))return true;
 return false;
}
function normalizedService(action:DashboardEmergencyExecutableAction):string{return action.domain&&action.service?`${action.domain}.${action.service}`:action.service??'';}
function decision(level:DashboardEmergencyActionPolicyLevel,allowed:boolean,requiresConfirmation:boolean,reason:string):DashboardEmergencyActionPolicyDecision{return{level,allowed,requiresConfirmation,reason};}
