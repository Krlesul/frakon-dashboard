import { describe, expect, it } from 'vitest';
import { dashboardEmergencyUiStrings, normalizeDashboardEmergencyLanguage } from './dashboard-emergency-ui-i18n';

describe('Emergency Focus UI localization', () => {
  it('normalizes Home Assistant locales with region suffixes', () => {
    expect(normalizeDashboardEmergencyLanguage('cs-CZ')).toBe('cs');
    expect(normalizeDashboardEmergencyLanguage('de_DE')).toBe('de');
    expect(normalizeDashboardEmergencyLanguage('fr-FR')).toBe('en');
  });

  it('returns Czech navigation and status strings', () => {
    const strings = dashboardEmergencyUiStrings('cs-CZ');
    expect(strings.previous).toBe('Předchozí');
    expect(strings.next).toBe('Další');
    expect(strings.emergencyFocusActive).toBe('Nouzové zaměření aktivní');
    expect(strings.nextCheckIn(4)).toBe('Další kontrola za 4 s');
  });
});
