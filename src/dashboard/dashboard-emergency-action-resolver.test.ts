import { describe,expect,it } from 'vitest';
import { resolveDashboardEmergencyAction } from './dashboard-emergency-action-resolver';
import type { DashboardEmergencyHistoryEntry } from './dashboard-emergency-history';
import type { DashboardEmergencyActionRecommendation } from './dashboard-emergency-actions';
const entry={signature:'x',itemId:'card-water',reasons:['water'],startedAt:1,sourceEntityIds:['binary_sensor.leak_kitchen'],sourceEntityMetadata:{'binary_sensor.leak_kitchen':{areaName:'Kitchen',deviceName:'Leak sensor'}}} as DashboardEmergencyHistoryEntry;
const action=(kind:DashboardEmergencyActionRecommendation['kind']):DashboardEmergencyActionRecommendation=>({id:`x:${kind}`,kind,label:kind,safe:'read-only',itemId:'card-water'});
describe('resolveDashboardEmergencyAction',()=>{
 it('prioritizes cameras in the emergency area',()=>{const result=resolveDashboardEmergencyAction(action('inspect-cameras'),entry,{'camera.kitchen':{entity_id:'camera.kitchen',state:'streaming',attributes:{friendly_name:'Kitchen camera'}},'camera.garden':{entity_id:'camera.garden',state:'streaming',attributes:{friendly_name:'Garden camera'}}},{'camera.kitchen':{areaName:'Kitchen'},'camera.garden':{areaName:'Garden'}});expect(result.targets.map(t=>t.entityId)).toEqual(['camera.kitchen','camera.garden']);expect(result.targets[0].score).toBeGreaterThan(result.targets[1].score);});
 it('finds a water shutoff by semantic identity',()=>{const result=resolveDashboardEmergencyAction(action('find-water-shutoff'),entry,{'valve.main_water':{entity_id:'valve.main_water',state:'open',attributes:{friendly_name:'Hlavní uzávěr vody'}},'switch.lamp':{entity_id:'switch.lamp',state:'on'}},{});expect(result.targets.map(t=>t.entityId)).toEqual(['valve.main_water']);});
 it('finds unavailable connectivity diagnostics',()=>{const result=resolveDashboardEmergencyAction(action('inspect-connectivity'),entry,{'sensor.device_link':{entity_id:'sensor.device_link',state:'unavailable',attributes:{friendly_name:'Device link'}},'sensor.temperature':{entity_id:'sensor.temperature',state:'21'}},{});expect(result.targets.map(t=>t.entityId)).toEqual(['sensor.device_link']);});
});
