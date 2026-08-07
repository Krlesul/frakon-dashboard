export type DashboardEmergencyUiLanguage = 'en' | 'cs' | 'de' | 'sk' | 'pl';

export interface DashboardEmergencyUiStrings {
  critical: string;
  emergencyFocusActive: string;
  urgent: string;
  confirming: string;
  coolingDown: string;
  nextCheckIn: (seconds: number) => string;
  criticalPosition: (index: number, total: number, itemId: string) => string;
  previous: string;
  next: string;
  returnToPreviousView: string;
  focusAgain: string;
  navigationLabel: string;
}

const STRINGS: Record<DashboardEmergencyUiLanguage, DashboardEmergencyUiStrings> = {
  en: {
    critical: 'critical', emergencyFocusActive: 'Emergency Focus active', urgent: 'urgent', confirming: 'confirming', coolingDown: 'cooling down',
    nextCheckIn: (seconds) => `Next check in ${seconds}s`,
    criticalPosition: (index, total, itemId) => `Critical ${index} of ${total} · ${itemId}`,
    previous: 'Previous', next: 'Next', returnToPreviousView: 'Return to previous view', focusAgain: 'Focus again', navigationLabel: 'Emergency Focus navigation',
  },
  cs: {
    critical: 'kritické', emergencyFocusActive: 'Nouzové zaměření aktivní', urgent: 'urgentní', confirming: 'čeká na potvrzení', coolingDown: 'dobíhá',
    nextCheckIn: (seconds) => `Další kontrola za ${seconds} s`,
    criticalPosition: (index, total, itemId) => `Kritická událost ${index} z ${total} · ${itemId}`,
    previous: 'Předchozí', next: 'Další', returnToPreviousView: 'Vrátit původní pohled', focusAgain: 'Znovu zaměřit', navigationLabel: 'Navigace nouzového zaměření',
  },
  de: {
    critical: 'kritisch', emergencyFocusActive: 'Notfallfokus aktiv', urgent: 'dringend', confirming: 'wird bestätigt', coolingDown: 'klingt ab',
    nextCheckIn: (seconds) => `Nächste Prüfung in ${seconds} s`,
    criticalPosition: (index, total, itemId) => `Kritisch ${index} von ${total} · ${itemId}`,
    previous: 'Zurück', next: 'Weiter', returnToPreviousView: 'Vorherige Ansicht', focusAgain: 'Erneut fokussieren', navigationLabel: 'Notfallfokus-Navigation',
  },
  sk: {
    critical: 'kritické', emergencyFocusActive: 'Núdzové zameranie aktívne', urgent: 'urgentné', confirming: 'čaká na potvrdenie', coolingDown: 'doznieva',
    nextCheckIn: (seconds) => `Ďalšia kontrola o ${seconds} s`,
    criticalPosition: (index, total, itemId) => `Kritická udalosť ${index} z ${total} · ${itemId}`,
    previous: 'Predchádzajúca', next: 'Ďalšia', returnToPreviousView: 'Vrátiť pôvodný pohľad', focusAgain: 'Znovu zamerať', navigationLabel: 'Navigácia núdzového zamerania',
  },
  pl: {
    critical: 'krytyczne', emergencyFocusActive: 'Tryb awaryjnego fokusowania aktywny', urgent: 'pilne', confirming: 'oczekuje na potwierdzenie', coolingDown: 'wygaszanie',
    nextCheckIn: (seconds) => `Następna kontrola za ${seconds} s`,
    criticalPosition: (index, total, itemId) => `Zdarzenie krytyczne ${index} z ${total} · ${itemId}`,
    previous: 'Poprzednie', next: 'Następne', returnToPreviousView: 'Przywróć poprzedni widok', focusAgain: 'Ustaw fokus ponownie', navigationLabel: 'Nawigacja trybu awaryjnego',
  },
};

export function normalizeDashboardEmergencyLanguage(language?: string): DashboardEmergencyUiLanguage {
  const normalized = (language ?? 'en').toLowerCase().split(/[-_]/)[0];
  return normalized === 'cs' || normalized === 'de' || normalized === 'sk' || normalized === 'pl' ? normalized : 'en';
}

export function dashboardEmergencyUiStrings(language?: string): DashboardEmergencyUiStrings {
  return STRINGS[normalizeDashboardEmergencyLanguage(language)];
}
