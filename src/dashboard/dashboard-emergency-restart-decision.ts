import type{DashboardEmergencyActionAuditEntry}from'./dashboard-emergency-action-audit';import type{DashboardEmergencyIdempotencyRecord}from'./dashboard-emergency-idempotency';
export type DashboardEmergencyRestartDecisionKind='retry'|'verify-first'|'completed'|'blocked';
export interface DashboardEmergencyRestartDecision{kind:DashboardEmergencyRestartDecisionKind;reason:string}
export function decideDashboardEmergencyRestartAction(audit:DashboardEmergencyActionAuditEntry|undefined,idempotency:DashboardEmergencyIdempotencyRecord|undefined):DashboardEmergencyRestartDecision{
 if(!audit)return{kind:'blocked',reason:'No persisted action audit exists.'};
 if(audit.verificationStatus==='verified')return{kind:'completed',reason:'The physical state was already verified.'};
 if(idempotency?.status==='completed')return{kind:'verify-first',reason:'The service call completed but the physical state still requires verification.'};
 if(idempotency?.status==='started')return{kind:'verify-first',reason:'The service call may have been sent before restart; verify state before any retry.'};
 if(idempotency?.status==='failed')return{kind:'retry',reason:'The previous service call failed and may be explicitly retried.'};
 if(audit.executionStatus==='failed')return{kind:'retry',reason:'The audited execution failed before completion.'};
 if(audit.executionStatus==='executed')return{kind:'verify-first',reason:'The audit records execution; verify physical state before retry.'};
 return{kind:'retry',reason:'No evidence exists that the physical service call was sent.'};
}
