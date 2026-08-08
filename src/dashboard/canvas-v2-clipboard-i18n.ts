import type { SupportedLanguage } from '../i18n';

export type CanvasV2ClipboardTranslationKey = 'copy' | 'cut' | 'paste' | 'copied' | 'cutDone' | 'pasted' | 'copyUnavailable' | 'pasteUnavailable';

type Messages = Record<CanvasV2ClipboardTranslationKey, string>;

const messages: Record<SupportedLanguage, Messages> = {
  en: { copy: 'Copy', cut: 'Cut', paste: 'Paste', copied: 'Selection copied', cutDone: 'Selection cut', pasted: 'Selection pasted', copyUnavailable: 'No unlocked selection to copy', pasteUnavailable: 'Clipboard is empty' },
  cs: { copy: 'Kopírovat', cut: 'Vyjmout', paste: 'Vložit', copied: 'Výběr zkopírován', cutDone: 'Výběr vyjmut', pasted: 'Výběr vložen', copyUnavailable: 'Není vybraná žádná odemčená karta', pasteUnavailable: 'Schránka je prázdná' },
  de: { copy: 'Kopieren', cut: 'Ausschneiden', paste: 'Einfügen', copied: 'Auswahl kopiert', cutDone: 'Auswahl ausgeschnitten', pasted: 'Auswahl eingefügt', copyUnavailable: 'Keine entsperrte Auswahl zum Kopieren', pasteUnavailable: 'Zwischenablage ist leer' },
  sk: { copy: 'Kopírovať', cut: 'Vystrihnúť', paste: 'Vložiť', copied: 'Výber skopírovaný', cutDone: 'Výber vystrihnutý', pasted: 'Výber vložený', copyUnavailable: 'Nie je vybraná žiadna odomknutá karta', pasteUnavailable: 'Schránka je prázdna' },
  pl: { copy: 'Kopiuj', cut: 'Wytnij', paste: 'Wklej', copied: 'Zaznaczenie skopiowane', cutDone: 'Zaznaczenie wycięte', pasted: 'Zaznaczenie wklejone', copyUnavailable: 'Brak odblokowanego zaznaczenia do skopiowania', pasteUnavailable: 'Schowek jest pusty' },
};

export function canvasV2ClipboardTranslate(language: SupportedLanguage, key: CanvasV2ClipboardTranslationKey): string {
  return messages[language]?.[key] ?? messages.en[key] ?? key;
}
