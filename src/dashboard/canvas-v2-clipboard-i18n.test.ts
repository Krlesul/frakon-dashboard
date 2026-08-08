import { describe, expect, it } from 'vitest';
import { canvasV2ClipboardTranslate } from './canvas-v2-clipboard-i18n';

describe('canvas v2 clipboard i18n', () => {
  it('contains localized copy, cut and paste labels in every supported language', () => {
    expect(canvasV2ClipboardTranslate('en', 'copy')).toBe('Copy');
    expect(canvasV2ClipboardTranslate('en', 'cut')).toBe('Cut');
    expect(canvasV2ClipboardTranslate('cs', 'paste')).toBe('Vložit');
    expect(canvasV2ClipboardTranslate('cs', 'cut')).toBe('Vyjmout');
    expect(canvasV2ClipboardTranslate('de', 'copy')).toBe('Kopieren');
    expect(canvasV2ClipboardTranslate('de', 'cut')).toBe('Ausschneiden');
    expect(canvasV2ClipboardTranslate('sk', 'paste')).toBe('Vložiť');
    expect(canvasV2ClipboardTranslate('sk', 'cut')).toBe('Vystrihnúť');
    expect(canvasV2ClipboardTranslate('pl', 'copy')).toBe('Kopiuj');
    expect(canvasV2ClipboardTranslate('pl', 'cut')).toBe('Wytnij');
  });
});
