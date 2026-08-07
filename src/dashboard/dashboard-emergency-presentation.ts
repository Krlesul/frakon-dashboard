import type { DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

export type DashboardEmergencyLocale = 'en' | 'cs' | 'de' | 'sk' | 'pl';
export type DashboardEmergencyKind = 'smoke' | 'gas' | 'water' | 'safety' | 'alarm' | 'battery' | 'climate' | 'unavailable' | 'generic';

export interface DashboardEmergencyPresentation {
  title: string;
  kind: DashboardEmergencyKind;
  icon: string;
  guidance: string;
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

const GUIDANCE: Record<DashboardEmergencyLocale, Record<DashboardEmergencyKind, string>> = {
  en: {
    smoke:'Check for fire. Leave the affected area if danger is suspected.',
    gas:'Avoid flames and electrical switches. Leave the area if a gas leak is suspected.',
    water:'Check the leak location and shut off the water supply if it is safe to do so.',
    safety:'Check the affected area and related safety sensors.',
    alarm:'Check cameras, doors and windows before taking further action.',
    battery:'Check the device and replace or recharge the battery when safe.',
    climate:'Check heating or cooling equipment and the current temperature.',
    unavailable:'Check device power, network connection and Home Assistant availability.',
    generic:'Check the affected device and confirm the condition before taking action.',
  },
  cs: {
    smoke:'Zkontrolujte, zda nehrozí požár. Při podezření na nebezpečí opusťte zasažený prostor.',
    gas:'Nepoužívejte otevřený oheň ani elektrické vypínače. Při podezření na únik plynu prostor opusťte.',
    water:'Zkontrolujte místo úniku a pokud je to bezpečné, uzavřete přívod vody.',
    safety:'Zkontrolujte dotčené místo a související bezpečnostní senzory.',
    alarm:'Zkontrolujte kamery, dveře a okna před další reakcí.',
    battery:'Zkontrolujte zařízení a bezpečně vyměňte nebo nabijte baterii.',
    climate:'Zkontrolujte topení nebo chlazení a aktuální teplotu.',
    unavailable:'Zkontrolujte napájení zařízení, síť a jeho dostupnost v Home Assistantu.',
    generic:'Zkontrolujte dotčené zařízení a ověřte stav před další reakcí.',
  },
  de: {
    smoke:'Prüfen Sie auf Feuer. Verlassen Sie den betroffenen Bereich bei Gefahrverdacht.',
    gas:'Vermeiden Sie offenes Feuer und elektrische Schalter. Verlassen Sie den Bereich bei Gasverdacht.',
    water:'Prüfen Sie die Leckstelle und schließen Sie die Wasserzufuhr, wenn dies sicher möglich ist.',
    safety:'Prüfen Sie den betroffenen Bereich und die zugehörigen Sicherheitssensoren.',
    alarm:'Prüfen Sie Kameras, Türen und Fenster, bevor Sie weitere Maßnahmen ergreifen.',
    battery:'Prüfen Sie das Gerät und ersetzen oder laden Sie die Batterie sicher.',
    climate:'Prüfen Sie Heizung oder Kühlung sowie die aktuelle Temperatur.',
    unavailable:'Prüfen Sie Stromversorgung, Netzwerk und Home-Assistant-Verfügbarkeit des Geräts.',
    generic:'Prüfen Sie das betroffene Gerät und bestätigen Sie den Zustand vor weiteren Maßnahmen.',
  },
  sk: {
    smoke:'Skontrolujte, či nehrozí požiar. Pri podozrení na nebezpečenstvo opustite zasiahnutý priestor.',
    gas:'Nepoužívajte otvorený oheň ani elektrické vypínače. Pri podozrení na únik plynu priestor opustite.',
    water:'Skontrolujte miesto úniku a ak je to bezpečné, uzavrite prívod vody.',
    safety:'Skontrolujte dotknuté miesto a súvisiace bezpečnostné senzory.',
    alarm:'Skontrolujte kamery, dvere a okná pred ďalšou reakciou.',
    battery:'Skontrolujte zariadenie a bezpečne vymeňte alebo nabite batériu.',
    climate:'Skontrolujte kúrenie alebo chladenie a aktuálnu teplotu.',
    unavailable:'Skontrolujte napájanie zariadenia, sieť a dostupnosť v Home Assistante.',
    generic:'Skontrolujte dotknuté zariadenie a overte stav pred ďalšou reakciou.',
  },
  pl: {
    smoke:'Sprawdź, czy nie ma pożaru. Opuść zagrożony obszar, jeśli podejrzewasz niebezpieczeństwo.',
    gas:'Nie używaj otwartego ognia ani przełączników elektrycznych. Opuść obszar przy podejrzeniu wycieku gazu.',
    water:'Sprawdź miejsce wycieku i zakręć dopływ wody, jeśli można to zrobić bezpiecznie.',
    safety:'Sprawdź zagrożony obszar i powiązane czujniki bezpieczeństwa.',
    alarm:'Sprawdź kamery, drzwi i okna przed podjęciem dalszych działań.',
    battery:'Sprawdź urządzenie i bezpiecznie wymień lub naładuj baterię.',
    climate:'Sprawdź ogrzewanie lub chłodzenie oraz aktualną temperaturę.',
    unavailable:'Sprawdź zasilanie urządzenia, sieć i dostępność w Home Assistant.',
    generic:'Sprawdź urządzenie i potwierdź stan przed podjęciem dalszych działań.',
  },
};

const ICONS: Record<DashboardEmergencyKind, string> = {
  smoke:'◉', gas:'◆', water:'●', safety:'!', alarm:'▲', battery:'▰', climate:'≈', unavailable:'×', generic:'!',
};

export function presentDashboardEmergency(target: DashboardEmergencyFocusTarget, locale: string = 'en'): DashboardEmergencyPresentation {
  const technicalReason = target.reasons[0];
  const sourceEntityId = target.sourceEntityIds[0];
  const kind = emergencyKind(technicalReason);
  const language = normalizeEmergencyLocale(locale);
  return {
    title: TITLES[language][kind],
    kind,
    icon: ICONS[kind],
    guidance: GUIDANCE[language][kind],
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
