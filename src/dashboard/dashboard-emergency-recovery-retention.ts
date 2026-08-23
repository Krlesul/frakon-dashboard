import type{DashboardEmergencyHistoryState}from'./dashboard-emergency-history';import{dashboardEmergencyHistoryOccurrenceId}from'./dashboard-emergency-occurrence';
export function dashboardEmergencyProtectedRecoveryOccurrences(history:DashboardEmergencyHistoryState):string[]{return[...history.active,...history.recent].map(dashboardEmergencyHistoryOccurrenceId)}
