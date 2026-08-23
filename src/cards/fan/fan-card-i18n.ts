import type { SupportedLanguage } from '../../i18n';

export type FrakonFanTranslationKey = 'on' | 'off' | 'speed' | 'unavailable';

const messages: Record<SupportedLanguage, Record<FrakonFanTranslationKey, string>> = {
  en: { on: 'On', off: 'Off', speed: 'Speed', unavailable: 'Unavailable' },
  cs: { on: 'Zapnuto', off: 'Vypnuto', speed: 'Rychlost', unavailable: 'Nedostupné' },
  de: { on: 'Ein', off: 'Aus', speed: 'Geschwindigkeit', unavailable: 'Nicht verfügbar' },
  sk: { on: 'Zapnuté', off: 'Vypnuté', speed: 'Rýchlosť', unavailable: 'Nedostupné' },
  pl: { on: 'Włączony', off: 'Wyłączony', speed: 'Prędkość', unavailable: 'Niedostępne' },
};

export function frakonFanTranslate(language: SupportedLanguage, key: FrakonFanTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
