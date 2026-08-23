import type { SupportedLanguage } from '../i18n';

export type ResponsiveV2AlphaReportTranslationKey =
  | 'copyReport'
  | 'copied'
  | 'copyFailed'
  | 'storageProofUnchanged'
  | 'storageProofChanged'
  | 'storageProofUnverifiable';

const messages: Record<SupportedLanguage, Record<ResponsiveV2AlphaReportTranslationKey, string>> = {
  en: {
    copyReport: 'Copy alpha validation report',
    copied: 'Alpha report copied',
    copyFailed: 'Could not copy alpha report',
    storageProofUnchanged: 'Dry-run storage proof: unchanged',
    storageProofChanged: 'Storage changed during dry-run check',
    storageProofUnverifiable: 'Dry-run storage proof unavailable',
  },
  cs: {
    copyReport: 'Kopírovat alpha validační report',
    copied: 'Alpha report zkopírován',
    copyFailed: 'Alpha report se nepodařilo zkopírovat',
    storageProofUnchanged: 'Důkaz dry-run: úložiště beze změny',
    storageProofChanged: 'Během dry-run kontroly se úložiště změnilo',
    storageProofUnverifiable: 'Důkaz dry-run úložiště není dostupný',
  },
  de: {
    copyReport: 'Alpha-Validierungsbericht kopieren',
    copied: 'Alpha-Bericht kopiert',
    copyFailed: 'Alpha-Bericht konnte nicht kopiert werden',
    storageProofUnchanged: 'Dry-Run-Speichernachweis: unverändert',
    storageProofChanged: 'Speicher änderte sich während der Dry-Run-Prüfung',
    storageProofUnverifiable: 'Dry-Run-Speichernachweis nicht verfügbar',
  },
  sk: {
    copyReport: 'Kopírovať alpha validačný report',
    copied: 'Alpha report skopírovaný',
    copyFailed: 'Alpha report sa nepodarilo skopírovať',
    storageProofUnchanged: 'Dôkaz dry-run: úložisko bez zmeny',
    storageProofChanged: 'Počas dry-run kontroly sa úložisko zmenilo',
    storageProofUnverifiable: 'Dôkaz dry-run úložiska nie je dostupný',
  },
  pl: {
    copyReport: 'Kopiuj raport walidacji alfa',
    copied: 'Raport alfa skopiowany',
    copyFailed: 'Nie udało się skopiować raportu alfa',
    storageProofUnchanged: 'Dowód dry-run: pamięć bez zmian',
    storageProofChanged: 'Pamięć zmieniła się podczas kontroli dry-run',
    storageProofUnverifiable: 'Dowód pamięci dry-run jest niedostępny',
  },
};

export function responsiveV2AlphaReportTranslate(
  language: SupportedLanguage,
  key: ResponsiveV2AlphaReportTranslationKey,
): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
