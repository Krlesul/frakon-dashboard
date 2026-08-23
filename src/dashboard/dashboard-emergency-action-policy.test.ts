import {describe,expect,it} from 'vitest';
import {evaluateDashboardEmergencyActionPolicy} from './dashboard-emergency-action-policy';
describe('Emergency action policy',()=>{
 it('allows inspection without confirmation',()=>{expect(evaluateDashboardEmergencyActionPolicy({kind:'inspect-cameras'},{active:true,acknowledged:false}).level).toBe('read-only');});
 it('requires confirmation before closing a physical water valve',()=>{const d=evaluateDashboardEmergencyActionPolicy({kind:'close-water',domain:'valve',service:'close_valve',entityId:'valve.main_water'},{active:true,acknowledged:false,emergencyKind:'water'});expect(d).toMatchObject({level:'confirmation-required',allowed:true,requiresConfirmation:true});});
 it('forbids unlocking and disarming in emergency mode',()=>{expect(evaluateDashboardEmergencyActionPolicy({kind:'unlock',domain:'lock',service:'unlock'},{active:true,acknowledged:true}).level).toBe('forbidden');expect(evaluateDashboardEmergencyActionPolicy({kind:'disarm',domain:'alarm_control_panel',service:'alarm_disarm'},{active:true,acknowledged:true}).allowed).toBe(false);});
 it('forbids state-changing actions on historical events',()=>{expect(evaluateDashboardEmergencyActionPolicy({kind:'close-water',domain:'valve',service:'close_valve'},{active:false,acknowledged:true,emergencyKind:'water'}).level).toBe('forbidden');});
 it('permits protective notifications automatically during active emergencies',()=>{expect(evaluateDashboardEmergencyActionPolicy({kind:'notify',domain:'persistent_notification',service:'create'},{active:true,acknowledged:false,emergencyKind:'smoke'}).level).toBe('safe-automatic');});
 it('defaults unknown state changes to confirmation required',()=>{expect(evaluateDashboardEmergencyActionPolicy({kind:'custom',domain:'switch',service:'turn_on'},{active:true,acknowledged:false}).requiresConfirmation).toBe(true);});
});
