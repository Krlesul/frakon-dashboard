import type { SupportedLanguage } from '../i18n';

export type ResponsiveV2AlphaReportTranslationKey =
  | 'copyReport'
  | 'copied'
  | 'copyFailed';

const messages: Record<SupportedLanguage, Record<ResponsiveV2AlphaReportTranslationKey, string>> = {
  en: { copyReport: 'Copy alpha validation report', copied: 'Alpha report copied', copyFailed: 'Could not copy alpha report' },
  cs: { copyReport: 'Kopírovat alpha validační report', copied: 'Alpha report zkopírován', copyFailed: 'Alpha report se nepodařilo zkopírovat' },
  de: { copyReport: 'Alpha-Validierungsbericht kopieren', copied: 'Alpha-Bericht kopiert', copyFailed: 'Alpha-Bericht konnte nicht kopiert werden' },
  sk: { copyReport: 'Kopírovať alpha validačný report', copied: 'Alpha report skopírovaný', copyFailed: 'Alpha report sa nepodarilo skopírovať' },
  pl: { copyReport: 'Kopiuj raport walidacji alfa', copied: 'Raport alfa skopiowany', copyFailed: 'Nie udało się skopiować raportu alfa' },
};

export function responsiveV2AlphaReportTranslate(
  language: SupportedLanguage,
  key: ResponsiveV2AlphaReportTranslationKey,
): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
