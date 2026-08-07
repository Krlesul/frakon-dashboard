import { resolveLanguage, type SupportedLanguage } from '../i18n';

export type CanvasDashboardTranslationKey =
  | 'experimentalCanvas'
  | 'compatibleCommit'
  | 'v2ReadReady'
  | 'v2ReadBlocked'
  | 'v2WriteReady'
  | 'v2WriteBlocked'
  | 'v2NativeReadOnly'
  | 'v2DraftUnsaved'
  | 'discardDraft'
  | 'draftDiscarded'
  | 'undo'
  | 'redo'
  | 'capabilityFailed'
  | 'changeCommitted'
  | 'collisionBlocked'
  | 'migrationPreview'
  | 'cards'
  | 'lockedCards'
  | 'constraints'
  | 'writeLocked';

type Messages = Record<CanvasDashboardTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: {
    experimentalCanvas: 'Experimental canvas', compatibleCommit: 'v1 compatible commit',
    v2ReadReady: 'v2 read ready', v2ReadBlocked: 'v2 read blocked', v2WriteReady: 'v2 write ready', v2WriteBlocked: 'v2 write blocked', v2NativeReadOnly: 'native v2 · read only',
    v2DraftUnsaved: 'native v2 · unsaved local draft', discardDraft: 'Discard draft', draftDiscarded: 'Local v2 draft discarded; server revision restored.',
    undo: 'Undo', redo: 'Redo',
    capabilityFailed: 'Capability negotiation failed', changeCommitted: 'Canvas change committed to compatible grid storage.',
    collisionBlocked: 'Canvas change blocked by collision', migrationPreview: 'v2 migration preview', cards: 'cards', lockedCards: 'locked', constraints: 'constraints', writeLocked: 'write locked',
  },
  cs: {
    experimentalCanvas: 'Experimentální canvas', compatibleCommit: 'kompatibilní zápis v1',
    v2ReadReady: 'čtení v2 připraveno', v2ReadBlocked: 'čtení v2 blokováno', v2WriteReady: 'zápis v2 připraven', v2WriteBlocked: 'zápis v2 blokován', v2NativeReadOnly: 'nativní v2 · pouze čtení',
    v2DraftUnsaved: 'nativní v2 · neuložený lokální návrh', discardDraft: 'Zahodit návrh', draftDiscarded: 'Lokální návrh v2 byl zahozen a obnovena serverová revize.',
    undo: 'Zpět', redo: 'Znovu',
    capabilityFailed: 'Vyjednání schopností serveru selhalo', changeCommitted: 'Změna canvasu byla bezpečně uložena do kompatibilního gridu.',
    collisionBlocked: 'Změna canvasu byla zablokována kvůli kolizi', migrationPreview: 'náhled migrace v2', cards: 'karet', lockedCards: 'zamčených', constraints: 'vazeb', writeLocked: 'zápis zamčen',
  },
  de: {
    experimentalCanvas: 'Experimentelle Canvas-Fläche', compatibleCommit: 'v1-kompatibles Speichern',
    v2ReadReady: 'v2 Lesen bereit', v2ReadBlocked: 'v2 Lesen blockiert', v2WriteReady: 'v2 Schreiben bereit', v2WriteBlocked: 'v2 Schreiben blockiert', v2NativeReadOnly: 'natives v2 · nur Lesen',
    v2DraftUnsaved: 'natives v2 · ungespeicherter lokaler Entwurf', discardDraft: 'Entwurf verwerfen', draftDiscarded: 'Lokaler v2-Entwurf verworfen; Serverrevision wiederhergestellt.',
    undo: 'Rückgängig', redo: 'Wiederholen',
    capabilityFailed: 'Aushandlung der Serverfähigkeiten fehlgeschlagen', changeCommitted: 'Canvas-Änderung wurde kompatibel im Grid gespeichert.',
    collisionBlocked: 'Canvas-Änderung wegen Kollision blockiert', migrationPreview: 'v2-Migrationsvorschau', cards: 'Karten', lockedCards: 'gesperrt', constraints: 'Constraints', writeLocked: 'Schreiben gesperrt',
  },
  sk: {
    experimentalCanvas: 'Experimentálny canvas', compatibleCommit: 'kompatibilný zápis v1',
    v2ReadReady: 'čítanie v2 pripravené', v2ReadBlocked: 'čítanie v2 blokované', v2WriteReady: 'zápis v2 pripravený', v2WriteBlocked: 'zápis v2 blokovaný', v2NativeReadOnly: 'natívne v2 · iba čítanie',
    v2DraftUnsaved: 'natívne v2 · neuložený lokálny návrh', discardDraft: 'Zahodiť návrh', draftDiscarded: 'Lokálny návrh v2 bol zahodený a obnovená serverová revízia.',
    undo: 'Späť', redo: 'Znova',
    capabilityFailed: 'Vyjednanie schopností servera zlyhalo', changeCommitted: 'Zmena canvasu bola bezpečne uložená do kompatibilného gridu.',
    collisionBlocked: 'Zmena canvasu bola zablokovaná pre kolíziu', migrationPreview: 'náhľad migrácie v2', cards: 'kariet', lockedCards: 'zamknutých', constraints: 'väzieb', writeLocked: 'zápis zamknutý',
  },
  pl: {
    experimentalCanvas: 'Eksperymentalny canvas', compatibleCommit: 'zapis zgodny z v1',
    v2ReadReady: 'odczyt v2 gotowy', v2ReadBlocked: 'odczyt v2 zablokowany', v2WriteReady: 'zapis v2 gotowy', v2WriteBlocked: 'zapis v2 zablokowany', v2NativeReadOnly: 'natywny v2 · tylko odczyt',
    v2DraftUnsaved: 'natywny v2 · niezapisany lokalny szkic', discardDraft: 'Odrzuć szkic', draftDiscarded: 'Lokalny szkic v2 odrzucony; przywrócono rewizję serwera.',
    undo: 'Cofnij', redo: 'Ponów',
    capabilityFailed: 'Negocjacja możliwości serwera nie powiodła się', changeCommitted: 'Zmiana canvasu została bezpiecznie zapisana w zgodnej siatce.',
    collisionBlocked: 'Zmiana canvasu zablokowana z powodu kolizji', migrationPreview: 'podgląd migracji v2', cards: 'kart', lockedCards: 'zablokowanych', constraints: 'powiązań', writeLocked: 'zapis zablokowany',
  },
};

export function resolveCanvasDashboardLanguage(...candidates: Array<string | undefined>): SupportedLanguage {
  return resolveLanguage(...candidates);
}

export function canvasDashboardTranslate(language: SupportedLanguage, key: CanvasDashboardTranslationKey): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}
