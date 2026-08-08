import { describe, expect, it } from 'vitest';
import { responsiveV2HealthTranslate } from './responsive-v2-health-i18n';

describe('responsive v2 health i18n', () => {
  it('contains localized diagnostics labels', () => {
    expect(responsiveV2HealthTranslate('cs', 'title')).toContain('Diagnostika');
    expect(responsiveV2HealthTranslate('de', 'blocked')).toBe('Blockiert');
    expect(responsiveV2HealthTranslate('sk', 'write')).toBe('Zápis');
    expect(responsiveV2HealthTranslate('pl', 'conflict')).toBe('Konflikt');
  });
});
