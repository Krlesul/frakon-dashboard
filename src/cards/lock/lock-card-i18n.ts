import type { SupportedLanguage } from '../../i18n';

export type FrakonLockTranslationKey =
  | 'lock'
  | 'unlock'
  | 'confirmUnlock'
  | 'locked'
  | 'unlocked'
  | 'locking'
  | 'unlocking'
  | 'unavailable'
  | 'unknown'
  | 'entityMissing';

const messages: Record<SupportedLanguage, Record<FrakonLockTranslationKey, string>> = {
  en: {
    lock: 'Lock', unlock: 'Unlock', confirmUnlock: 'Confirm unlock', locked: 'Locked', unlocked: 'Unlocked',
    locking: 'Locking', unlocking: 'Unlocking', unavailable: 'Unavailable', unknown: 'Unknown', entityMissing: 'Entity not found',
  },
  cs: {
    lock: 'Zamknout', unlock: 'Odemknout', confirmUnlock: 'Potvrdit odemknutí', locked: 'Zamčeno', unlocked: 'Odemčeno',
    locking: 'Zamykání', unlocking: 'Odemykání', unavailable: 'Nedostupné', unknown: 'Neznámý stav', entityMissing: 'Entita nebyla nalezena',
  },
  de: {
    lock: 'Verriegeln', unlock: 'Entriegeln', confirmUnlock: 'Entriegeln bestätigen', locked: 'Verriegelt', unlocked: 'Entriegelt',
    locking: 'Wird verriegelt', unlocking: 'Wird entriegelt', unavailable: 'Nicht verfügbar', unknown: 'Unbekannt', entityMissing: 'Entität nicht gefunden',
  },
  sk: {
    lock: 'Zamknúť', unlock: 'Odomknúť', confirmUnlock: 'Potvrdiť odomknutie', locked: 'Zamknuté', unlocked: 'Odomknuté',
    locking: 'Zamykanie', unlocking: 'Odomykanie', unavailable: 'Nedostupné', unknown: 'Neznámy stav', entityMissing: 'Entita nebola nájdená',
  },
  pl: {
    lock: 'Zablokuj', unlock: 'Odblokuj', confirmUnlock: 'Potwierdź odblokowanie', locked: 'Zablokowane', unlocked: 'Odblokowane',
    locking: 'Blokowanie', unlocking: 'Odblokowywanie', unavailable: 'Niedostępne', unknown: 'Nieznany stan', entityMissing: 'Nie znaleziono encji',
  },
};

export function frakonLockTranslate(language: SupportedLanguage, key: FrakonLockTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}

export function frakonLockStateLabel(language: SupportedLanguage, state: string): string {
  if (state === 'locked') return frakonLockTranslate(language, 'locked');
  if (state === 'unlocked') return frakonLockTranslate(language, 'unlocked');
  if (state === 'locking') return frakonLockTranslate(language, 'locking');
  if (state === 'unlocking') return frakonLockTranslate(language, 'unlocking');
  if (state === 'unavailable') return frakonLockTranslate(language, 'unavailable');
  return frakonLockTranslate(language, 'unknown');
}
