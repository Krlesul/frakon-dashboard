import { describe, expect, it } from 'vitest';
import { canvasV2CardConfigTranslate } from './canvas-v2-card-config-i18n';

describe('canvas v2 card config i18n', () => {
  it('provides localized labels for supported languages', () => {
    expect(canvasV2CardConfigTranslate('en', 'showBrightness')).toContain('brightness');
    expect(canvasV2CardConfigTranslate('cs', 'temperatureStep')).toContain('teplot');
    expect(canvasV2CardConfigTranslate('de', 'showVolume')).toContain('Lautstärke');
    expect(canvasV2CardConfigTranslate('sk', 'showPosition')).toContain('polohu');
    expect(canvasV2CardConfigTranslate('pl', 'showState')).toContain('stan');
  });
});
