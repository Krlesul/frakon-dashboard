import type { SupportedLanguage } from '../i18n';
import type { ResponsiveCanvasV2WriteBlocker } from './responsive-v2-write-readiness';

export type ResponsiveV2SaveTranslationKey =
  | 'title' | 'clean' | 'dirty' | 'ready' | 'blocked' | 'save' | 'validateOnServer'
  | 'validationValid' | 'validationConflict' | 'validationBlocked'
  | 'baseRevision' | 'candidateRevision' | 'dirtyBreakpoints' | 'noDirtyBreakpoints'
  | ResponsiveCanvasV2WriteBlocker;

type Messages = Record<ResponsiveV2SaveTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: {
    title: 'Responsive save readiness', clean: 'No local changes', dirty: 'Local changes', ready: 'Ready to save', blocked: 'Save blocked', save: 'Save responsive layout', validateOnServer: 'Validate on server', validationValid: 'Server validation passed — no storage was changed', validationConflict: 'Server validation found a newer remote revision', validationBlocked: 'Server validation is unavailable', baseRevision: 'Base revision', candidateRevision: 'Candidate revision', dirtyBreakpoints: 'Changed breakpoints', noDirtyBreakpoints: 'none',
    'invalid-bundle': 'Responsive bundle is invalid', 'contract-incompatible': 'Responsive transport contract is incompatible', 'read-disabled': 'Responsive reads are disabled', 'write-disabled': 'Responsive writes are disabled', 'atomic-revision-disabled': 'Atomic revisions are disabled', 'revision-sync-disabled': 'Revision sync is disabled', 'unsupported-breakpoint': 'Server does not support every used breakpoint', 'unresolved-conflict': 'Resolve the responsive conflict first',
  },
  cs: {
    title: 'Připravenost responsive zápisu', clean: 'Žádné lokální změny', dirty: 'Lokální změny', ready: 'Připraveno k uložení', blocked: 'Uložení zablokováno', save: 'Uložit responsive rozložení', validateOnServer: 'Ověřit na serveru', validationValid: 'Serverová validace prošla — úložiště se nezměnilo', validationConflict: 'Serverová validace našla novější vzdálenou revizi', validationBlocked: 'Serverová validace není dostupná', baseRevision: 'Výchozí revize', candidateRevision: 'Kandidátní revize', dirtyBreakpoints: 'Změněné breakpointy', noDirtyBreakpoints: 'žádné',
    'invalid-bundle': 'Responsive balíček je neplatný', 'contract-incompatible': 'Transportní kontrakt responsive vrstvy není kompatibilní', 'read-disabled': 'Čtení responsive dat je vypnuté', 'write-disabled': 'Zápis responsive dat je vypnutý', 'atomic-revision-disabled': 'Atomické revize jsou vypnuté', 'revision-sync-disabled': 'Synchronizace revizí je vypnutá', 'unsupported-breakpoint': 'Server nepodporuje všechny použité breakpointy', 'unresolved-conflict': 'Nejdříve vyřešte responsive konflikt',
  },
  de: {
    title: 'Responsive-Speicherbereitschaft', clean: 'Keine lokalen Änderungen', dirty: 'Lokale Änderungen', ready: 'Speicherbereit', blocked: 'Speichern blockiert', save: 'Responsive-Layout speichern', validateOnServer: 'Auf Server prüfen', validationValid: 'Serverprüfung erfolgreich — Speicher wurde nicht verändert', validationConflict: 'Serverprüfung fand eine neuere Remote-Revision', validationBlocked: 'Serverprüfung ist nicht verfügbar', baseRevision: 'Basisrevision', candidateRevision: 'Kandidatenrevision', dirtyBreakpoints: 'Geänderte Breakpoints', noDirtyBreakpoints: 'keine',
    'invalid-bundle': 'Responsive-Bundle ist ungültig', 'contract-incompatible': 'Der Responsive-Transportvertrag ist nicht kompatibel', 'read-disabled': 'Responsive-Lesen ist deaktiviert', 'write-disabled': 'Responsive-Schreiben ist deaktiviert', 'atomic-revision-disabled': 'Atomare Revisionen sind deaktiviert', 'revision-sync-disabled': 'Revisionssynchronisierung ist deaktiviert', 'unsupported-breakpoint': 'Server unterstützt nicht alle verwendeten Breakpoints', 'unresolved-conflict': 'Responsive-Konflikt zuerst lösen',
  },
  sk: {
    title: 'Pripravenosť responsive zápisu', clean: 'Žiadne lokálne zmeny', dirty: 'Lokálne zmeny', ready: 'Pripravené na uloženie', blocked: 'Uloženie zablokované', save: 'Uložiť responsive rozloženie', validateOnServer: 'Overiť na serveri', validationValid: 'Serverová validácia prešla — úložisko sa nezmenilo', validationConflict: 'Serverová validácia našla novšiu vzdialenú revíziu', validationBlocked: 'Serverová validácia nie je dostupná', baseRevision: 'Východisková revízia', candidateRevision: 'Kandidátna revízia', dirtyBreakpoints: 'Zmenené breakpointy', noDirtyBreakpoints: 'žiadne',
    'invalid-bundle': 'Responsive balík je neplatný', 'contract-incompatible': 'Transportný kontrakt responsive vrstvy nie je kompatibilný', 'read-disabled': 'Čítanie responsive dát je vypnuté', 'write-disabled': 'Zápis responsive dát je vypnutý', 'atomic-revision-disabled': 'Atomické revízie sú vypnuté', 'revision-sync-disabled': 'Synchronizácia revízií je vypnutá', 'unsupported-breakpoint': 'Server nepodporuje všetky použité breakpointy', 'unresolved-conflict': 'Najprv vyriešte responsive konflikt',
  },
  pl: {
    title: 'Gotowość zapisu responsywnego', clean: 'Brak lokalnych zmian', dirty: 'Zmiany lokalne', ready: 'Gotowe do zapisu', blocked: 'Zapis zablokowany', save: 'Zapisz układ responsywny', validateOnServer: 'Sprawdź na serwerze', validationValid: 'Walidacja serwera powiodła się — magazyn nie został zmieniony', validationConflict: 'Walidacja serwera wykryła nowszą zdalną rewizję', validationBlocked: 'Walidacja serwera jest niedostępna', baseRevision: 'Rewizja bazowa', candidateRevision: 'Rewizja kandydująca', dirtyBreakpoints: 'Zmienione breakpointy', noDirtyBreakpoints: 'brak',
    'invalid-bundle': 'Pakiet responsywny jest nieprawidłowy', 'contract-incompatible': 'Kontrakt transportu responsywnego jest niezgodny', 'read-disabled': 'Odczyt responsywny jest wyłączony', 'write-disabled': 'Zapis responsywny jest wyłączony', 'atomic-revision-disabled': 'Rewizje atomowe są wyłączone', 'revision-sync-disabled': 'Synchronizacja rewizji jest wyłączona', 'unsupported-breakpoint': 'Serwer nie obsługuje wszystkich użytych breakpointów', 'unresolved-conflict': 'Najpierw rozwiąż konflikt responsywny',
  },
};

export function responsiveV2SaveTranslate(language: SupportedLanguage, key: ResponsiveV2SaveTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
