import {describe,expect,it} from 'vitest';
import {recommendDashboardEmergencyActions} from './dashboard-emergency-actions';
import type {DashboardEmergencyHistoryEntry} from './dashboard-emergency-history';
const entry=(reason:string):DashboardEmergencyHistoryEntry=>({signature:'sig',itemId:'card',sourceEntityIds:['binary_sensor.source'],sourceEntityLabels:{'binary_sensor.source':'Zdroj'},reasons:[reason],startedAt:1});
describe('Emergency action recommendations',()=>{
 it('offers navigation plus non-destructive water investigation actions',()=>{const actions=recommendDashboardEmergencyActions(entry('binary_sensor.source reports an active moisture condition'),'cs',true);expect(actions.map(a=>a.kind)).toEqual(['locate-card','focus-card','open-source','find-water-shutoff','inspect-cameras']);expect(actions.find(a=>a.kind==='find-water-shutoff')?.label).toBe('Najít uzávěr vody');expect(actions.every(a=>a.safe==='navigation'||a.safe==='read-only')).toBe(true);});
 it('does not offer focus for historical events',()=>{expect(recommendDashboardEmergencyActions(entry('camera.gate is unavailable'),'en',false).map(a=>a.kind)).toEqual(['locate-card','open-source','inspect-connectivity']);});
 it('maps alarm events to cameras and entry-point inspection',()=>{expect(recommendDashboardEmergencyActions(entry('alarm_control_panel.home is in alarm state triggered'),'en').map(a=>a.kind)).toContain('inspect-entry-points');});
 it('never synthesizes a destructive service call',()=>{const actions=recommendDashboardEmergencyActions(entry('binary_sensor.source reports an active gas condition'),'en');expect(actions.some(a=>String(a.kind).includes('turn-off')||String(a.kind).includes('close-valve'))).toBe(false);});
});
