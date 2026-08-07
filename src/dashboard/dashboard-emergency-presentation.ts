import type { DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

export type DashboardEmergencyLocale = 'en' | 'cs' | 'de' | 'sk' | 'pl';
export type DashboardEmergencyKind = 'smoke' | 'gas' | 'water' | 'safety' | 'alarm' | 'battery' | 'climate' | 'unavailable' | 'generic';

export interface DashboardEmergencyPresentation {
  title: string;
  kind: DashboardEmergencyKind;
  icon: string;
  sourceLabel?: string;
  technicalReason?: string;
  sourceEntityId?: string;
}

const TITLES: Record<DashboardEmergencyLocale, Record<DashboardEmergencyKind, string>> = {
  en: { smoke:'Smoke detected', gas:'Gas detected', water:'Water leak detected', safety:'Safety alert', alarm:'Security alarm active', battery:'Critical battery condition', climate:'Critical climate condition', unavailable:'Device unavailable', generic:'Critical Home Assistant condition' },
  cs: { smoke:'Detekován kouř', gas:'Detekován plyn', water:'Detekován únik vody', safety:'Bezpečnostní upozornění', alarm:'Aktivní bezpečnostní alarm', battery:'Kritický stav baterie', climate:'Kritický stav vytápění', unavailable:'Zařízení není dostupné', generic:'Kritický stav Home Assistantu' },
  de: { smoke:'Rauch erkannt', gas:'Gas erkannt', water:'Wasserleck erkannt', safety:'Sicherheitswarnung', alarm:'Sicherheitsalarm aktiv', battery:'Kritischer Batteriestand', climate:'Kritischer Klimazustand', unavailable:'Gerät nicht verfügbar', generic:'Kritischer Home-Assistant-Zustand' },
  sk: { smoke:'Detegovaný dym', gas:'Detegovaný plyn', water:'Detegovaný únik vody', safety:'Bezpečnostné upozornenie', alarm:'Aktívny bezpečnostný alarm', battery:'Kritický stav batérie', climate:'Kritický stav vykurovania', unavailable:'Zariadenie nie je dostupné', generic:'Kritický stav Home Assistantu' },
  pl: { smoke:'Wykryto dym', gas:'Wykryto gaz', water:'Wykryto wyciek wody', safety:'Alert bezpieczeństwa', alarm:'Aktywny alarm bezpieczeństwa', battery:'Krytyczny stan baterii', climate:'Krytyczny stan ogrzewania', unavailable:'Urządzenie jest niedostępne', generic:'Krytyczny stan Home Assistanta' },
};

const ICONS: Record<DashboardEmergencyKind, string> = {
  smoke: '◉',
  gas: '◆',
  water: '●',
  safety: '!',
  alarm: '▲',
  battery: '▰',
  climate: '≈',
  unavailable: '×',
  generic: '!',
};

export function presentDashboardEmergency(target: DashboardEmergencyFocusTarget, locale: string = 'en'): DashboardEmergencyPresentation {
  const technicalReason = target.reasons[0];
  const sourceEntityId = target.sourceEntityIds[0];
  const kind = emergencyKind(technicalReason);
  return {
    title: TITLES[normalizeEmergencyLocale(locale)][kind],
    kind,
    icon: ICONS[kind],
    sourceLabel: sourceEntityId ? target.sourceEntityLabels[sourceEntityId] ?? humanizeEntityId(sourceEntityId) : undefined,
    technicalReason,
    sourceEntityId,
  };
}

export function emergencyKind(reason?: string): DashboardEmergencyKind {
  if (!reason) return 'generic';
  const normalized = reason.toLowerCase();
  if (normalized.includes('active smoke condition')) return 'smoke';
  if (normalized.includes('active gas condition')) return 'gas';
  if (normalized.includes('active moisture condition')) return 'water';
  if (normalized.includes('active safety condition')) return 'safety';
  if (normalized.includes('alarm state')) return 'alarm';
  if (normalized.includes('low battery')) return 'battery';
  if (normalized.includes('climate problem')) return 'climate';
  if (normalized.includes('unavailable')) return 'unavailable';
  return 'generic';
}

export function emergencyTitle(reason?: string, locale: string = 'en'): string {
  const language = normalizeEmergencyLocale(locale);
  return TITLES[language][emergencyKind(reason)];
}

export function normalizeEmergencyLocale(locale: string): DashboardEmergencyLocale {
  const language = locale.trim().toLowerCase().split(/[-_]/)[0];
  return language === 'cs' || language === 'de' || language === 'sk' || language === 'pl' ? language : 'en';
}

export function humanizeEntityId(entityId: string): string {
  const objectId = entityId.includes('.') ? entityId.slice(entityId.indexOf('.') + 1) : entityId;
  return objectId.split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
