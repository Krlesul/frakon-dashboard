import { describe, expect, it } from 'vitest';
import { resolveLanguage, translate } from '../src/i18n';

describe('FRAKON i18n', () => {
  it('resolves regional language tags', () => {
    expect(resolveLanguage('cs-CZ')).toBe('cs');
    expect(resolveLanguage('de-DE')).toBe('de');
  });

  it('falls back to English', () => {
    expect(resolveLanguage('ja-JP')).toBe('en');
    expect(translate('en', 'on')).toBe('On');
  });
});
