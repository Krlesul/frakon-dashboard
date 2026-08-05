import { describe, expect, it } from 'vitest';
import { editorTranslate, resolveEditorLanguage } from './editor-i18n';

describe('editor translations', () => {
  it('resolves supported regional languages', () => {
    expect(resolveEditorLanguage('cs-CZ')).toBe('cs');
    expect(resolveEditorLanguage('de-DE')).toBe('de');
  });

  it('falls back to English', () => {
    expect(resolveEditorLanguage('fr-FR')).toBe('en');
  });

  it('contains translated editor controls', () => {
    expect(editorTranslate('cs', 'addCard')).toBe('Přidat FRAKON kartu');
    expect(editorTranslate('de', 'apply')).toBe('Übernehmen');
    expect(editorTranslate('pl', 'searchCards')).toBe('Szukaj kart');
  });
});
