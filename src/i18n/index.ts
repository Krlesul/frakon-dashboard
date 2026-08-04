export const supportedLanguages = ['en', 'cs', 'de', 'sk', 'pl'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export type TranslationKey =
  | 'on'
  | 'off'
  | 'open'
  | 'closed'
  | 'unavailable'
  | 'unknown'
  | 'entityMissing'
  | 'brightness'
  | 'temperature'
  | 'position';

type Messages = Record<TranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { on: 'On', off: 'Off', open: 'Open', closed: 'Closed', unavailable: 'Unavailable', unknown: 'Unknown', entityMissing: 'Entity not found', brightness: 'Brightness', temperature: 'Temperature', position: 'Position' },
  cs: { on: 'Zapnuto', off: 'Vypnuto', open: 'Otevřeno', closed: 'Zavřeno', unavailable: 'Nedostupné', unknown: 'Neznámé', entityMissing: 'Entita nebyla nalezena', brightness: 'Jas', temperature: 'Teplota', position: 'Poloha' },
  de: { on: 'Ein', off: 'Aus', open: 'Offen', closed: 'Geschlossen', unavailable: 'Nicht verfügbar', unknown: 'Unbekannt', entityMissing: 'Entität nicht gefunden', brightness: 'Helligkeit', temperature: 'Temperatur', position: 'Position' },
  sk: { on: 'Zapnuté', off: 'Vypnuté', open: 'Otvorené', closed: 'Zatvorené', unavailable: 'Nedostupné', unknown: 'Neznáme', entityMissing: 'Entita nebola nájdená', brightness: 'Jas', temperature: 'Teplota', position: 'Poloha' },
  pl: { on: 'Włączone', off: 'Wyłączone', open: 'Otwarte', closed: 'Zamknięte', unavailable: 'Niedostępne', unknown: 'Nieznane', entityMissing: 'Nie znaleziono encji', brightness: 'Jasność', temperature: 'Temperatura', position: 'Pozycja' },
};

export function resolveLanguage(...candidates: Array<string | undefined>): SupportedLanguage {
  for (const candidate of candidates) {
    const base = candidate?.toLowerCase().split('-')[0] as SupportedLanguage | undefined;
    if (base && supportedLanguages.includes(base)) return base;
  }
  return 'en';
}

export function translate(language: SupportedLanguage, key: TranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
