import { canExecuteDashboardEmergencyPlan,type DashboardEmergencyExecutionPlan } from './dashboard-emergency-action-execution';
import{claimDashboardEmergencyIdempotentExecution,dashboardEmergencyIdempotencyKey,finishDashboardEmergencyIdempotentExecution,type DashboardEmergencyIdempotencyStore}from'./dashboard-emergency-idempotency';

export interface DashboardEmergencyExecutionSnapshot { incidentSignature:string; incidentOccurrenceId?:string; incidentActive:boolean; entityState?:string; capturedAt:number; }
export interface DashboardEmergencyExecutionAdapter { callService(domain:string,service:string,data:Record<string,unknown>):Promise<unknown>|unknown; }
export interface DashboardEmergencyExecutionResult { status:'executed'|'blocked'|'stale'|'duplicate'|'failed'; reason?:string; }
const inFlight=new Set<string>();
export async function executeDashboardEmergencyPlan(plan:DashboardEmergencyExecutionPlan,adapter:DashboardEmergencyExecutionAdapter,snapshot:DashboardEmergencyExecutionSnapshot,current:DashboardEmergencyExecutionSnapshot,confirmed=false,idempotencyStore?:DashboardEmergencyIdempotencyStore):Promise<DashboardEmergencyExecutionResult>{
 if(!canExecuteDashboardEmergencyPlan(plan,confirmed))return{status:'blocked',reason:'Policy or confirmation prevents execution.'};
 if(!snapshot.incidentActive||!current.incidentActive||snapshot.incidentSignature!==current.incidentSignature)return{status:'stale',reason:'Emergency incident is no longer the same active incident.'};
 if(snapshot.incidentOccurrenceId!==current.incidentOccurrenceId)return{status:'stale',reason:'Emergency incident occurrence changed after the execution plan was created.'};
 if(snapshot.entityState!==undefined&&current.entityState!==snapshot.entityState)return{status:'stale',reason:'Target entity state changed after the execution plan was created.'};
 const key=dashboardEmergencyIdempotencyKey(plan,snapshot);if(inFlight.has(key))return{status:'duplicate',reason:'The same emergency action is already being executed.'};
 if(idempotencyStore){const claim=claimDashboardEmergencyIdempotentExecution(idempotencyStore,key);if(claim==='duplicate')return{status:'duplicate',reason:'The same emergency action was already started or completed for this incident.'};if(claim==='storage-failed')return{status:'blocked',reason:'Emergency execution safety state could not be persisted; physical action was not sent.'}}
 const call=plan.call;if(!call){if(idempotencyStore)finishDashboardEmergencyIdempotentExecution(idempotencyStore,key,'failed');return{status:'blocked',reason:'No executable Home Assistant service call exists.'};}
 inFlight.add(key);try{await adapter.callService(call.domain,call.service,call.serviceData);if(idempotencyStore)finishDashboardEmergencyIdempotentExecution(idempotencyStore,key,'completed');return{status:'executed'};}catch(error){if(idempotencyStore)finishDashboardEmergencyIdempotentExecution(idempotencyStore,key,'failed');return{status:'failed',reason:error instanceof Error?error.message:String(error)};}finally{inFlight.delete(key);}
}
