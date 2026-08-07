export type DashboardEmergencyUiLanguage = 'en' | 'cs' | 'de' | 'sk' | 'pl';

export interface DashboardEmergencyUiStrings {
  critical: string; emergencyFocusActive: string; urgent: string; confirming: string; coolingDown: string;
  nextCheckIn: (seconds:number)=>string; criticalPosition:(index:number,total:number,itemId:string)=>string;
  previous:string; next:string; returnToPreviousView:string; focusAgain:string; navigationLabel:string;
  acknowledge:string; acknowledged:string;
}

const STRINGS: Record<DashboardEmergencyUiLanguage, DashboardEmergencyUiStrings> = {
  en:{ critical:'critical',emergencyFocusActive:'Emergency Focus active',urgent:'urgent',confirming:'confirming',coolingDown:'cooling down',nextCheckIn:(s)=>`Next check in ${s}s`,criticalPosition:(i,t,id)=>`Critical ${i} of ${t} · ${id}`,previous:'Previous',next:'Next',returnToPreviousView:'Return to previous view',focusAgain:'Focus again',navigationLabel:'Emergency Focus navigation',acknowledge:'I have seen this',acknowledged:'Acknowledged' },
  cs:{ critical:'kritické',emergencyFocusActive:'Nouzové zaměření aktivní',urgent:'urgentní',confirming:'čeká na potvrzení',coolingDown:'dobíhá',nextCheckIn:(s)=>`Další kontrola za ${s} s`,criticalPosition:(i,t,id)=>`Kritická událost ${i} z ${t} · ${id}`,previous:'Předchozí',next:'Další',returnToPreviousView:'Vrátit původní pohled',focusAgain:'Znovu zaměřit',navigationLabel:'Navigace nouzového zaměření',acknowledge:'Viděl jsem upozornění',acknowledged:'Potvrzeno' },
  de:{ critical:'kritisch',emergencyFocusActive:'Notfallfokus aktiv',urgent:'dringend',confirming:'wird bestätigt',coolingDown:'klingt ab',nextCheckIn:(s)=>`Nächste Prüfung in ${s} s`,criticalPosition:(i,t,id)=>`Kritisch ${i} von ${t} · ${id}`,previous:'Zurück',next:'Weiter',returnToPreviousView:'Vorherige Ansicht',focusAgain:'Erneut fokussieren',navigationLabel:'Notfallfokus-Navigation',acknowledge:'Hinweis gesehen',acknowledged:'Bestätigt' },
  sk:{ critical:'kritické',emergencyFocusActive:'Núdzové zameranie aktívne',urgent:'urgentné',confirming:'čaká na potvrdenie',coolingDown:'doznieva',nextCheckIn:(s)=>`Ďalšia kontrola o ${s} s`,criticalPosition:(i,t,id)=>`Kritická udalosť ${i} z ${t} · ${id}`,previous:'Predchádzajúca',next:'Ďalšia',returnToPreviousView:'Vrátiť pôvodný pohľad',focusAgain:'Znovu zamerať',navigationLabel:'Navigácia núdzového zamerania',acknowledge:'Videl som upozornenie',acknowledged:'Potvrdené' },
  pl:{ critical:'krytyczne',emergencyFocusActive:'Tryb awaryjnego fokusowania aktywny',urgent:'pilne',confirming:'oczekuje na potwierdzenie',coolingDown:'wygaszanie',nextCheckIn:(s)=>`Następna kontrola za ${s} s`,criticalPosition:(i,t,id)=>`Zdarzenie krytyczne ${i} z ${t} · ${id}`,previous:'Poprzednie',next:'Następne',returnToPreviousView:'Przywróć poprzedni widok',focusAgain:'Ustaw fokus ponownie',navigationLabel:'Nawigacja trybu awaryjnego',acknowledge:'Widziałem ostrzeżenie',acknowledged:'Potwierdzono' },
};

export function normalizeDashboardEmergencyLanguage(language?:string):DashboardEmergencyUiLanguage { const n=(language??'en').toLowerCase().split(/[-_]/)[0]; return n==='cs'||n==='de'||n==='sk'||n==='pl'?n:'en'; }
export function dashboardEmergencyUiStrings(language?:string):DashboardEmergencyUiStrings { return STRINGS[normalizeDashboardEmergencyLanguage(language)]; }
