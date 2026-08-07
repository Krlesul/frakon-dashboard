import type{DashboardEmergencyActionAuditEntry}from'./dashboard-emergency-action-audit';import type{DashboardEmergencyIdempotencyRecord}from'./dashboard-emergency-idempotency';import type{DashboardEmergencyExecutionJournalEntry}from'./dashboard-emergency-execution-journal';import{diagnoseDashboardEmergencyRestartEvidence}from'./dashboard-emergency-restart-evidence-consistency';
export type DashboardEmergencyRestartDecisionKind='retry'|'verify-first'|'completed'|'blocked';
export interface DashboardEmergencyRestartDecision{kind:DashboardEmergencyRestartDecisionKind;reason:string;consistency?:'consistent'|'incomplete'|'conflict';evidenceReasons?:string[]}
export function decideDashboardEmergencyRestartAction(audit:DashboardEmergencyActionAuditEntry|undefined,idempotency:DashboardEmergencyIdempotencyRecord|undefined,journal?:DashboardEmergencyExecutionJournalEntry):DashboardEmergencyRestartDecision{
 const diagnostic=diagnoseDashboardEmergencyRestartEvidence(audit,idempotency,journal);const evidence={consistency:diagnostic.consistency,evidenceReasons:diagnostic.reasons};
 if(!audit)return{kind:'blocked',reason:'No persisted action audit exists.',...evidence};
 if(audit.verificationStatus==='verified'||journal?.phase==='verified')return{kind:'completed',reason:diagnostic.consistency==='conflict'?'Physical state is verified, but persisted execution evidence is inconsistent.': 'The physical state was already verified.',...evidence};
 if(diagnostic.consistency==='conflict'&&diagnostic.requiresVerification)return{kind:'verify-first',reason:`Persisted execution evidence is inconsistent: ${diagnostic.reasons.join(' ')}`,...evidence};
 if(journal?.phase==='dispatching')return{kind:'verify-first',reason:'Restart occurred inside the dispatch uncertainty window; the service call may have reached Home Assistant.',...evidence};
 if(journal?.phase==='dispatched')return{kind:'verify-first',reason:'The service call returned and physical device state must be verified before any retry.',...evidence};
 if(journal?.phase==='failed'){
  if(audit.verificationStatus==='failed')return{kind:'retry',reason:'Physical verification failed after the attempt; a fresh confirmed retry may be prepared.',...evidence};
  if(idempotency?.status==='failed'||audit.executionStatus==='failed'||audit.executionStatus==='blocked')return{kind:'retry',reason:'The recorded dispatch attempt failed and may be explicitly retried.',...evidence};
  if(idempotency?.status==='started'||idempotency?.status==='completed'||audit.executionStatus==='executed')return{kind:'verify-first',reason:'Failure evidence conflicts with evidence that the command may have been dispatched; verify physical state before retry.',...evidence};
  return{kind:'retry',reason:'The execution journal records a failed attempt that may be retried with fresh confirmation.',...evidence};
 }
 if(journal?.phase==='prepared'){
  if(idempotency?.status==='started'||idempotency?.status==='completed'||audit.executionStatus==='executed')return{kind:'verify-first',reason:'Prepared journal evidence conflicts with dispatch evidence; verify physical state before retry.',...evidence};
  return{kind:'retry',reason:'The action was durably prepared but never entered dispatch.',...evidence};
 }
 if(idempotency?.status==='completed')return{kind:'verify-first',reason:'The service call completed but the physical state still requires verification.',...evidence};
 if(idempotency?.status==='started')return{kind:'verify-first',reason:'The service call may have been sent before restart; verify state before any retry.',...evidence};
 if(idempotency?.status==='failed')return{kind:'retry',reason:'The previous service call failed and may be explicitly retried.',...evidence};
 if(audit.executionStatus==='failed'||audit.executionStatus==='blocked')return{kind:'retry',reason:'The audited execution did not complete and may be explicitly retried.',...evidence};
 if(audit.executionStatus==='executed')return{kind:'verify-first',reason:'The audit records execution; verify physical state before retry.',...evidence};
 if(audit.confirmed)return{kind:'verify-first',reason:'A confirmed legacy attempt has no durable execution marker; its physical outcome is ambiguous and must be verified before retry.',...evidence};
 return{kind:'retry',reason:'No evidence exists that the physical service call was sent.',...evidence};
}
