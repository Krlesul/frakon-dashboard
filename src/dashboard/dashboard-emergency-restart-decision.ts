import type{DashboardEmergencyActionAuditEntry}from'./dashboard-emergency-action-audit';import type{DashboardEmergencyIdempotencyRecord}from'./dashboard-emergency-idempotency';import type{DashboardEmergencyExecutionJournalEntry}from'./dashboard-emergency-execution-journal';
export type DashboardEmergencyRestartDecisionKind='retry'|'verify-first'|'completed'|'blocked';
export interface DashboardEmergencyRestartDecision{kind:DashboardEmergencyRestartDecisionKind;reason:string}
export function decideDashboardEmergencyRestartAction(audit:DashboardEmergencyActionAuditEntry|undefined,idempotency:DashboardEmergencyIdempotencyRecord|undefined,journal?:DashboardEmergencyExecutionJournalEntry):DashboardEmergencyRestartDecision{
 if(!audit)return{kind:'blocked',reason:'No persisted action audit exists.'};
 if(audit.verificationStatus==='verified'||journal?.phase==='verified')return{kind:'completed',reason:'The physical state was already verified.'};
 if(journal?.phase==='dispatching')return{kind:'verify-first',reason:'Restart occurred inside the dispatch uncertainty window; the service call may have reached Home Assistant.'};
 if(journal?.phase==='dispatched')return{kind:'verify-first',reason:'The service call returned and physical device state must be verified before any retry.'};
 if(journal?.phase==='failed'){
  if(audit.verificationStatus==='failed')return{kind:'retry',reason:'Physical verification failed after the attempt; a fresh confirmed retry may be prepared.'};
  if(idempotency?.status==='failed'||audit.executionStatus==='failed'||audit.executionStatus==='blocked')return{kind:'retry',reason:'The recorded dispatch attempt failed and may be explicitly retried.'};
  if(idempotency?.status==='started'||idempotency?.status==='completed'||audit.executionStatus==='executed')return{kind:'verify-first',reason:'Failure evidence conflicts with evidence that the command may have been dispatched; verify physical state before retry.'};
  return{kind:'retry',reason:'The execution journal records a failed attempt that may be retried with fresh confirmation.'};
 }
 if(journal?.phase==='prepared'){
  if(idempotency?.status==='started'||idempotency?.status==='completed'||audit.executionStatus==='executed')return{kind:'verify-first',reason:'Prepared journal evidence conflicts with dispatch evidence; verify physical state before retry.'};
  return{kind:'retry',reason:'The action was durably prepared but never entered dispatch.'};
 }
 if(idempotency?.status==='completed')return{kind:'verify-first',reason:'The service call completed but the physical state still requires verification.'};
 if(idempotency?.status==='started')return{kind:'verify-first',reason:'The service call may have been sent before restart; verify state before any retry.'};
 if(idempotency?.status==='failed')return{kind:'retry',reason:'The previous service call failed and may be explicitly retried.'};
 if(audit.executionStatus==='failed'||audit.executionStatus==='blocked')return{kind:'retry',reason:'The audited execution did not complete and may be explicitly retried.'};
 if(audit.executionStatus==='executed')return{kind:'verify-first',reason:'The audit records execution; verify physical state before retry.'};
 if(audit.confirmed)return{kind:'verify-first',reason:'A confirmed legacy attempt has no durable execution marker; its physical outcome is ambiguous and must be verified before retry.'};
 return{kind:'retry',reason:'No evidence exists that the physical service call was sent.'};
}
