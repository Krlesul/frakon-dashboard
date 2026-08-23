import type{DashboardEmergencyHistoryEntry}from'./dashboard-emergency-history';
export function dashboardEmergencyOccurrenceId(signature:string,startedAt:number):string{return`${signature}@@${startedAt}`}
export function dashboardEmergencyHistoryOccurrenceId(entry:Pick<DashboardEmergencyHistoryEntry,'signature'|'startedAt'>):string{return dashboardEmergencyOccurrenceId(entry.signature,entry.startedAt)}
export function dashboardEmergencyOccurrenceBaseSignature(occurrenceId:string):string{const separator=occurrenceId.lastIndexOf('@@');return separator>=0?occurrenceId.slice(0,separator):occurrenceId}
