import type { SupportedLanguage } from '../i18n';
import type { ResponsiveCanvasV2WriteBlocker } from './responsive-v2-write-readiness';

export type ResponsiveV2SaveTranslationKey =
  | 'title' | 'clean' | 'dirty' | 'ready' | 'blocked' | 'save' | 'baseRevision' | 'candidateRevision'
  | 'dirtyBreakpoints' | 'noDirtyBreakpoints' | ResponsiveCanvasV2WriteBlocker;

type Messages = Record<ResponsiveV2SaveTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: {
    title: 'Responsive save readiness', clean: 'No local changes', dirty: 'Local changes', ready: 'Ready to save', blocked: 'Save blocked', save: 'Save responsive layout', baseRevision: 'Base revision', candidateRevision: 'Candidate revision', dirtyBreakpoints: 'Changed breakpoints', noDirtyBreakpoints: 'none',
    'invalid-bundle': 'Responsive bundle is invalid', 'read-disabled': 'Responsive reads are disabled', 'write-disabled': 'Responsive writes are disabled', 'atomic-revision-disabled': 'Atomic revisions are disabled', 'revision-sync-disabled': 'Revision sync is disabled', 'unsupported-breakpoint': 'Server does not support every used breakpoint', 'unresolved-conflict': 'Resolve the responsive conflict first',
  },
  cs: {
    title: 'Připravenost responsive zápisu', clean: 'Žádné lokální změny', dirty: 'Lokální změny', ready: 'Připraveno k uložení', blocked: 'Uložení zablokováno', save: 'Uložit responsive rozložení', baseRevision: 'Výchozí revize', candidateRevision: 'Kandidátní revize', dirtyBreakpoints: 'Změněné breakpointy', noDirtyBreakpoints: 'žádné',
    'invalid-bundle': 'Responsive balíček je neplatný', 'read-disabled': 'Čtení responsive dat je vypnuté', 'write-disabled': 'Zápis responsive dat je vypnutý', 'atomic-revision-disabled': 'Atomické revize jsou vypnuté', 'revision-sync-disabled': 'Synchronizace revizí je vypnutá', 'unsupported-breakpoint': 'Server nepodporuje všechny použité breakpointy', 'unresolved-conflict': 'Nejdříve vyřešte responsive konflikt',
  },
  de: {
    title: 'Responsive-Speicherbereitschaft', clean: 'Keine lokalen Änderungen', dirty: 'Lokale Änderungen', ready: 'Speicherbereit', blocked: 'Speichern blockiert', save: 'Responsive-Layout speichern', baseRevision: 'Basisrevision', candidateRevision: 'Kandidatenrevision', dirtyBreakpoints: 'Geänderte Breakpoints', noDirtyBreakpoints: 'keine',
    'invalid-bundle': 'Responsive-Bundle ist ungültig', 'read-disabled': 'Responsive-Lesen ist deaktiviert', 'write-disabled': 'Responsive-Schreiben ist deaktiviert', 'atomic-revision-disabled': 'Atomare Revisionen sind deaktiviert', 'revision-sync-disabled': 'Revisionssynchronisierung ist deaktiviert', 'unsupported-breakpoint': 'Server unterstützt nicht alle verwendeten Breakpoints', 'unresolved-conflict': 'Responsive-Konflikt zuerst lösen',
  },
  sk: {
    title: 'Pripravenosť responsive zápisu', clean: 'Žiadne lokálne zmeny', dirty: 'Lokálne zmeny', ready: 'Pripravené na uloženie', blocked: 'Uloženie zablokované', save: 'Uložiť responsive rozloženie', baseRevision: 'Východisková revízia', candidateRevision: 'Kandidátna revízia', dirtyBreakpoints: 'Zmenené breakpointy', noDirtyBreakpoints: 'žiadne',
    'invalid-bundle': 'Responsive balík je neplatný', 'read-disabled': 'Čítanie responsive dát je vypnuté', 'write-disabled': 'Zápis responsive dát je vypnutý', 'atomic-revision-disabled': 'Atomické revízie sú vypnuté', 'revision-sync-disabled': 'Synchronizácia revízií je vypnutá', 'unsupported-breakpoint': 'Server nepodporuje všetky použité breakpointy', 'unresolved-conflict': 'Najprv vyriešte responsive konflikt',
  },
  pl: {
    title: 'Gotowość zapisu responsywnego', clean: 'Brak lokalnych zmian', dirty: 'Zmiany lokalne', ready: 'Gotowe do zapisu', blocked: 'Zapis zablokowany', save: 'Zapisz układ responsywny', baseRevision: 'Rewizja bazowa', candidateRevision: 'Rewizja kandydująca', dirtyBreakpoints: 'Zmienione breakpointy', noDirtyBreakpoints: 'brak',
    'invalid-bundle': 'Pakiet responsywny jest nieprawidłowy', 'read-disabled': 'Odczyt responsywny jest wyłączony', 'write-disabled': 'Zapis responsywny jest wyłączony', 'atomic-revision-disabled': 'Rewizje atomowe są wyłączone', 'revision-sync-disabled': 'Synchronizacja rewizji jest wyłączona', 'unsupported-breakpoint': 'Serwer nie obsługuje wszystkich użytych breakpointów', 'unresolved-conflict': 'Najpierw rozwiąż konflikt responsywny',
  },
};

export function responsiveV2SaveTranslate(language: SupportedLanguage, key: ResponsiveV2SaveTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
