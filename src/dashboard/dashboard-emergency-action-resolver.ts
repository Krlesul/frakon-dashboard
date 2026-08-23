import type { DashboardEmergencyHistoryEntry } from './dashboard-emergency-history';
import type { DashboardEmergencyActionKind, DashboardEmergencyActionRecommendation } from './dashboard-emergency-actions';
import type { DashboardEntityMetadata } from './dashboard-intelligence';

export interface DashboardEmergencyResolvableState { entity_id:string; state:string; attributes?:Record<string,unknown>; }
export interface DashboardEmergencyResolvedTarget { entityId:string; state:string; label:string; areaName?:string; deviceName?:string; score:number; }
export interface DashboardEmergencyActionResolution { recommendation:DashboardEmergencyActionRecommendation; title:string; targets:DashboardEmergencyResolvedTarget[]; }

const DOMAINS:Partial<Record<DashboardEmergencyActionKind,string[]>>={
 'inspect-cameras':['camera'],
 'inspect-entry-points':['binary_sensor','cover','lock'],
 'inspect-connectivity':['binary_sensor','sensor'],
 'inspect-climate':['climate','sensor','binary_sensor','switch'],
 'inspect-battery':['sensor','binary_sensor'],
 'find-water-shutoff':['valve','switch','cover'],
};

export function resolveDashboardEmergencyAction(recommendation:DashboardEmergencyActionRecommendation,entry:DashboardEmergencyHistoryEntry,states:Record<string,DashboardEmergencyResolvableState|undefined>,metadata:Record<string,DashboardEntityMetadata|undefined>={}):DashboardEmergencyActionResolution{
 const sourceAreas=new Set(entry.sourceEntityIds.map(id=>entry.sourceEntityMetadata?.[id]?.areaName||metadata[id]?.areaName).filter((v):v is string=>Boolean(v)).map(normalize));
 const sourceDevices=new Set(entry.sourceEntityIds.map(id=>entry.sourceEntityMetadata?.[id]?.deviceName||metadata[id]?.deviceName).filter((v):v is string=>Boolean(v)).map(normalize));
 const targets=Object.entries(states).flatMap(([entityId,state])=>{if(!state)return[];const domain=entityId.split('.')[0],allowed=DOMAINS[recommendation.kind];if(!allowed?.includes(domain))return[];const meta=metadata[entityId],label=entityLabel(state,entityId),haystack=normalize(`${entityId} ${label} ${meta?.areaName??''} ${meta?.deviceName??''}`);if(!matchesKind(recommendation.kind,domain,haystack,state))return[];let score=0;if(meta?.areaName&&sourceAreas.has(normalize(meta.areaName)))score+=100;if(meta?.deviceName&&sourceDevices.has(normalize(meta.deviceName)))score+=70;if(entry.sourceEntityIds.includes(entityId))score+=50;if(recommendation.kind==='inspect-cameras'&&domain==='camera')score+=20;if(recommendation.kind==='find-water-shutoff'&&/water|voda|wasser|valve|ventil|shutoff|uzaver/.test(haystack))score+=25;return[{entityId,state:state.state,label,areaName:meta?.areaName,deviceName:meta?.deviceName,score}];}).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)).slice(0,12);
 return{recommendation,title:recommendation.label,targets};
}
function entityLabel(state:DashboardEmergencyResolvableState,entityId:string):string{const name=state.attributes?.friendly_name;return typeof name==='string'&&name.trim()?name.trim():entityId;}
function normalize(value:string):string{return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function matchesKind(kind:DashboardEmergencyActionKind,domain:string,text:string,state:DashboardEmergencyResolvableState):boolean{switch(kind){case'inspect-entry-points':return domain==='lock'||domain==='cover'||/door|window|dvere|okno|gate|brana|contact|kontakt/.test(text);case'inspect-connectivity':return state.state==='unavailable'||/connect|online|offline|signal|wifi|rssi|link|spojeni|pripojeni/.test(text);case'inspect-climate':return domain==='climate'||/temperature|teplota|heat|heating|topeni|boiler|kotel|hvac|cool/.test(text);case'inspect-battery':return /battery|bater/.test(text)||state.attributes?.device_class==='battery';case'find-water-shutoff':return /water|voda|wasser|valve|ventil|shutoff|uzaver/.test(text);case'inspect-cameras':return domain==='camera';default:return false;}}
