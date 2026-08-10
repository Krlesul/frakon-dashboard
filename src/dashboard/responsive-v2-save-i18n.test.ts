import { describe, expect, it } from 'vitest';
import { responsiveV2SaveTranslate } from './responsive-v2-save-i18n';

describe('responsive v2 save i18n', () => {
  it('translates write blockers for all supported editor languages', () => {
    expect(responsiveV2SaveTranslate('en', 'write-disabled')).toContain('writes');
    expect(responsiveV2SaveTranslate('cs', 'write-disabled')).toContain('Zápis');
    expect(responsiveV2SaveTranslate('de', 'write-disabled')).toContain('Schreiben');
    expect(responsiveV2SaveTranslate('sk', 'write-disabled')).toContain('Zápis');
    expect(responsiveV2SaveTranslate('pl', 'write-disabled')).toContain('Zapis');
  });

  it('contains localized save action labels', () => {
    expect(responsiveV2SaveTranslate('cs', 'save')).toContain('Uložit');
    expect(responsiveV2SaveTranslate('de', 'save')).toContain('speichern');
    expect(responsiveV2SaveTranslate('pl', 'save')).toContain('Zapisz');
  });

  it('contains localized non-mutating server validation labels', () => {
    expect(responsiveV2SaveTranslate('en', 'validateOnServer')).toContain('Validate');
    expect(responsiveV2SaveTranslate('cs', 'validateOnServer')).toContain('Ověřit');
    expect(responsiveV2SaveTranslate('de', 'validateOnServer')).toContain('Server');
    expect(responsiveV2SaveTranslate('sk', 'validationValid')).toContain('úložisko');
    expect(responsiveV2SaveTranslate('pl', 'validationConflict')).toContain('rewizję');
  });
});
