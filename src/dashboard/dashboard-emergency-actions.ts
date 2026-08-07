import type { DashboardEmergencyHistoryEntry } from './dashboard-emergency-history';
import { emergencyKind, normalizeEmergencyLocale, type DashboardEmergencyKind, type DashboardEmergencyLocale } from './dashboard-emergency-presentation';

export type DashboardEmergencyActionKind='open-source'|'locate-card'|'focus-card'|'inspect-cameras'|'inspect-entry-points'|'inspect-connectivity'|'inspect-climate'|'inspect-battery'|'find-water-shutoff';
export interface DashboardEmergencyActionRecommendation { id:string; kind:DashboardEmergencyActionKind; label:string; safe:'read-only'|'navigation'; entityId?:string; itemId?:string; }

const LABELS:Record<DashboardEmergencyLocale,Record<DashboardEmergencyActionKind,string>>={
 en:{'open-source':'Open source entity','locate-card':'Find dashboard card','focus-card':'Focus active alert','inspect-cameras':'Inspect cameras','inspect-entry-points':'Inspect doors and windows','inspect-connectivity':'Check device connectivity','inspect-climate':'Inspect climate equipment','inspect-battery':'Inspect battery device','find-water-shutoff':'Find water shutoff'},
 cs:{'open-source':'Otevřít zdrojovou entitu','locate-card':'Najít kartu dashboardu','focus-card':'Zaměřit aktivní výstrahu','inspect-cameras':'Zkontrolovat kamery','inspect-entry-points':'Zkontrolovat dveře a okna','inspect-connectivity':'Zkontrolovat připojení zařízení','inspect-climate':'Zkontrolovat topení a chlazení','inspect-battery':'Zkontrolovat zařízení s baterií','find-water-shutoff':'Najít uzávěr vody'},
 de:{'open-source':'Quellentität öffnen','locate-card':'Dashboard-Karte finden','focus-card':'Aktiven Alarm fokussieren','inspect-cameras':'Kameras prüfen','inspect-entry-points':'Türen und Fenster prüfen','inspect-connectivity':'Geräteverbindung prüfen','inspect-climate':'Klimatechnik prüfen','inspect-battery':'Batteriegerät prüfen','find-water-shutoff':'Wasserabsperrung finden'},
 sk:{'open-source':'Otvoriť zdrojovú entitu','locate-card':'Nájsť kartu dashboardu','focus-card':'Zamerať aktívnu výstrahu','inspect-cameras':'Skontrolovať kamery','inspect-entry-points':'Skontrolovať dvere a okná','inspect-connectivity':'Skontrolovať pripojenie zariadenia','inspect-climate':'Skontrolovať kúrenie a chladenie','inspect-battery':'Skontrolovať zariadenie s batériou','find-water-shutoff':'Nájsť uzáver vody'},
 pl:{'open-source':'Otwórz encję źródłową','locate-card':'Znajdź kartę dashboardu','focus-card':'Pokaż aktywny alarm','inspect-cameras':'Sprawdź kamery','inspect-entry-points':'Sprawdź drzwi i okna','inspect-connectivity':'Sprawdź łączność urządzenia','inspect-climate':'Sprawdź ogrzewanie i chłodzenie','inspect-battery':'Sprawdź urządzenie bateryjne','find-water-shutoff':'Znajdź zawór wody'}
};

export function recommendDashboardEmergencyActions(entry:DashboardEmergencyHistoryEntry,locale='en',active=true):DashboardEmergencyActionRecommendation[]{
 const language=normalizeEmergencyLocale(locale),kind=emergencyKind(entry.reasons[0]),actions:DashboardEmergencyActionRecommendation[]=[];
 const add=(actionKind:DashboardEmergencyActionKind,safe:'read-only'|'navigation'='navigation')=>actions.push({id:`${entry.signature}:${actionKind}`,kind:actionKind,label:LABELS[language][actionKind],safe,itemId:entry.itemId});
 add('locate-card'); if(active)add('focus-card'); const entityId=entry.sourceEntityIds[0]; if(entityId)actions.push({id:`${entry.signature}:open-source`,kind:'open-source',label:LABELS[language]['open-source'],safe:'navigation',entityId,itemId:entry.itemId});
 for(const actionKind of contextualActions(kind))add(actionKind,'read-only'); return actions;
}
function contextualActions(kind:DashboardEmergencyKind):DashboardEmergencyActionKind[]{ switch(kind){case'water':return['find-water-shutoff','inspect-cameras'];case'smoke':case'gas':return['inspect-cameras'];case'alarm':case'safety':return['inspect-cameras','inspect-entry-points'];case'unavailable':return['inspect-connectivity'];case'climate':return['inspect-climate'];case'battery':return['inspect-battery'];default:return[];} }
