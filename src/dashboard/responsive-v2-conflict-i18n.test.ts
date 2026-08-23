import { describe, expect, it } from 'vitest';
import { responsiveV2ConflictTranslate } from './responsive-v2-conflict-i18n';

describe('responsive v2 conflict i18n', () => {
  it('translates the conflict resolution action in all supported languages', () => {
    expect(responsiveV2ConflictTranslate('en', 'resolve')).toContain('Resolve');
    expect(responsiveV2ConflictTranslate('cs', 'resolve')).toContain('Vyřešit');
    expect(responsiveV2ConflictTranslate('de', 'resolve')).toContain('lösen');
    expect(responsiveV2ConflictTranslate('sk', 'resolve')).toContain('Vyriešiť');
    expect(responsiveV2ConflictTranslate('pl', 'resolve')).toContain('Rozwiąż');
  });

  it('contains a localized concurrent-change explanation', () => {
    expect(responsiveV2ConflictTranslate('cs', 'concurrent-change')).toContain('Obě zařízení');
    expect(responsiveV2ConflictTranslate('de', 'concurrent-change')).toContain('Beide Geräte');
  });
});
