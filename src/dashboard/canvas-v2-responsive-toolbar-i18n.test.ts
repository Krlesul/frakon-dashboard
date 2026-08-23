import { describe, expect, it } from 'vitest';
import { canvasV2ResponsiveToolbarTranslate } from './canvas-v2-responsive-toolbar-i18n';

describe('canvas v2 responsive toolbar i18n', () => {
  it('contains localized Auto, copy and reset controls', () => {
    expect(canvasV2ResponsiveToolbarTranslate('cs', 'manual')).toBe('Ručně');
    expect(canvasV2ResponsiveToolbarTranslate('cs', 'copyFrom')).toContain('Kopírovat');
    expect(canvasV2ResponsiveToolbarTranslate('de', 'reset')).toContain('zurücksetzen');
    expect(canvasV2ResponsiveToolbarTranslate('sk', 'copy')).toContain('Kopírovať');
    expect(canvasV2ResponsiveToolbarTranslate('pl', 'responsiveLayout')).toContain('responsywny');
  });

  it('keeps Auto stable across all supported languages', () => {
    for (const language of ['en', 'cs', 'de', 'sk', 'pl'] as const) {
      expect(canvasV2ResponsiveToolbarTranslate(language, 'auto')).toBe('Auto');
    }
  });
});
