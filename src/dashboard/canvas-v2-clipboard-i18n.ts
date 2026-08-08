import type { SupportedLanguage } from '../i18n';

export type CanvasV2ClipboardTranslationKey = 'copy' | 'paste' | 'copied' | 'pasted' | 'copyUnavailable' | 'pasteUnavailable';

type Messages = Record<CanvasV2ClipboardTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { copy: 'Copy', paste: 'Paste', copied: 'Selection copied', pasted: 'Selection pasted', copyUnavailable: 'No unlocked selection to copy', pasteUnavailable: 'Clipboard is empty' },
  cs: { copy: 'Kopírovat', paste: 'Vložit', copied: 'Výběr zkopírován', pasted: 'Výběr vložen', copyUnavailable: 'Není vybraná žádná odemčená karta', pasteUnavailable: 'Schránka je prázdná' },
  de: { copy: 'Kopieren', paste: 'Einfügen', copied: 'Auswahl kopiert', pasted: 'Auswahl eingefügt', copyUnavailable: 'Keine entsperrte Auswahl zum Kopieren', pasteUnavailable: 'Zwischenablage ist leer' },
  sk: { copy: 'Kopírovať', paste: 'Vložiť', copied: 'Výber skopírovaný', pasted: 'Výber vložený', copyUnavailable: 'Nie je vybraná žiadna odomknutá karta', pasteUnavailable: 'Schránka je prázdna' },
  pl: { copy: 'Kopiuj', paste: 'Wklej', copied: 'Zaznaczenie skopiowane', pasted: 'Zaznaczenie wklejone', copyUnavailable: 'Brak odblokowanego zaznaczenia do skopiowania', pasteUnavailable: 'Schowek jest pusty' },
};

export function canvasV2ClipboardTranslate(language: SupportedLanguage, key: CanvasV2ClipboardTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
