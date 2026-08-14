import type { SupportedLanguage } from '../../i18n';

export type FrakonActionLabelKind = 'press' | 'run' | 'activate' | 'unavailable';

const messages: Record<SupportedLanguage, Record<FrakonActionLabelKind, string>> = {
  en: { press: 'Press', run: 'Run', activate: 'Activate', unavailable: 'Unavailable' },
  cs: { press: 'Stisknout', run: 'Spustit', activate: 'Aktivovat', unavailable: 'Nedostupné' },
  de: { press: 'Drücken', run: 'Ausführen', activate: 'Aktivieren', unavailable: 'Nicht verfügbar' },
  sk: { press: 'Stlačiť', run: 'Spustiť', activate: 'Aktivovať', unavailable: 'Nedostupné' },
  pl: { press: 'Naciśnij', run: 'Uruchom', activate: 'Aktywuj', unavailable: 'Niedostępne' },
};

export function frakonActionLabel(
  language: SupportedLanguage,
  entityId: string,
  unavailable = false,
): string {
  const dictionary = messages[language] ?? messages.en;
  if (unavailable) return dictionary.unavailable;
  const domain = entityId.split('.', 1)[0];
  if (domain === 'button' || domain === 'input_button') return dictionary.press;
  if (domain === 'script') return dictionary.run;
  return dictionary.activate;
}
