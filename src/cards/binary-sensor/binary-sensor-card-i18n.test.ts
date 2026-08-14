import { describe, expect, it } from 'vitest';
import { frakonBinarySensorStateLabel } from './binary-sensor-card-i18n';

describe('binary sensor card i18n', () => {
  it('translates common door states', () => {
    expect(frakonBinarySensorStateLabel('cs', 'off', 'door')).toBe('Zavřeno');
    expect(frakonBinarySensorStateLabel('de', 'on', 'door')).toBe('Offen');
    expect(frakonBinarySensorStateLabel('sk', 'on', 'window')).toBe('Otvorené');
    expect(frakonBinarySensorStateLabel('pl', 'off', 'window')).toBe('Zamknięte');
  });

  it('translates hazard and unavailable states', () => {
    expect(frakonBinarySensorStateLabel('cs', 'on', 'smoke')).toContain('kouř');
    expect(frakonBinarySensorStateLabel('de', 'on', 'moisture')).toBe('Nass');
    expect(frakonBinarySensorStateLabel('pl', 'unavailable', 'motion')).toBe('Niedostępne');
  });
});
