export const supportedLanguages = ['en', 'cs', 'de', 'sk', 'pl'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

type Messages = Record<string, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { on: 'On', off: 'Off', unavailable: 'Unavailable', entityMissing: 'Entity not found' },
  cs: { on: 'Zapnuto', off: 'Vypnuto', unavailable: 'Nedostupné', entityMissing: 'Entita nebyla nalezena' },
  de: { on: 'Ein', off: 'Aus', unavailable: 'Nicht verfügbar', entityMissing: 'Entität nicht gefunden' },
  sk: { on: 'Zapnuté', off: 'Vypnuté', unavailable: 'Nedostupné', entityMissing: 'Entita nebola nájdená' },
  pl: { on: 'Włączone', off: 'Wyłączone', unavailable: 'Niedostępne', entityMissing: 'Nie znaleziono encji' },
};

export function resolveLanguage(...candidates: Array<string | undefined>): SupportedLanguage {
  for (const candidate of candidates) {
    const base = candidate?.toLowerCase().split('-')[0] as SupportedLanguage | undefined;
    if (base && supportedLanguages.includes(base)) return base;
  }
  return 'en';
}

export function translate(language: SupportedLanguage, key: string): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
