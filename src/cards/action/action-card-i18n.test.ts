import { describe, expect, it } from 'vitest';
import { frakonActionLabel } from './action-card-i18n';

describe('FRAKON action card i18n', () => {
  it('uses domain-specific action labels', () => {
    expect(frakonActionLabel('cs', 'button.restart')).toBe('Stisknout');
    expect(frakonActionLabel('de', 'script.movie')).toBe('Ausführen');
    expect(frakonActionLabel('sk', 'scene.evening')).toBe('Aktivovať');
    expect(frakonActionLabel('pl', 'input_button.good_night')).toBe('Naciśnij');
  });

  it('uses the unavailable label instead of an actionable verb', () => {
    expect(frakonActionLabel('en', 'script.movie', true)).toBe('Unavailable');
    expect(frakonActionLabel('cs', 'scene.evening', true)).toBe('Nedostupné');
  });
});
