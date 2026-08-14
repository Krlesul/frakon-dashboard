import { describe, expect, it } from 'vitest';
import { responsiveV2AlphaReportTranslate } from './responsive-v2-alpha-report-i18n';

describe('responsive v2 alpha report i18n', () => {
  it('provides copy labels for every supported language', () => {
    expect(responsiveV2AlphaReportTranslate('en', 'copyReport')).toContain('Copy');
    expect(responsiveV2AlphaReportTranslate('cs', 'copyReport')).toContain('Kopírovat');
    expect(responsiveV2AlphaReportTranslate('de', 'copyReport')).toContain('kopieren');
    expect(responsiveV2AlphaReportTranslate('sk', 'copyReport')).toContain('Kopírovať');
    expect(responsiveV2AlphaReportTranslate('pl', 'copyReport')).toContain('Kopiuj');
  });
});
