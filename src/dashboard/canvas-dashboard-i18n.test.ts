import { describe, expect, it } from 'vitest';
import { canvasDashboardTranslate, resolveCanvasDashboardLanguage } from './canvas-dashboard-i18n';

describe('canvas dashboard i18n', () => {
  it('resolves all supported editor languages', () => {
    expect(resolveCanvasDashboardLanguage('cs-CZ')).toBe('cs');
    expect(resolveCanvasDashboardLanguage('de-DE')).toBe('de');
    expect(resolveCanvasDashboardLanguage('sk-SK')).toBe('sk');
    expect(resolveCanvasDashboardLanguage('pl-PL')).toBe('pl');
  });

  it('falls back to English for unsupported locales', () => {
    expect(resolveCanvasDashboardLanguage('fr-FR')).toBe('en');
    expect(canvasDashboardTranslate('en', 'v2WriteBlocked')).toBe('v2 write blocked');
  });

  it('contains localized capability, migration, history and constraint labels', () => {
    expect(canvasDashboardTranslate('cs', 'migrationPreview')).toBe('náhled migrace v2');
    expect(canvasDashboardTranslate('cs', 'undo')).toBe('Zpět');
    expect(canvasDashboardTranslate('cs', 'constraintEditor')).toBe('Editor vazeb');
    expect(canvasDashboardTranslate('de', 'redo')).toBe('Wiederholen');
    expect(canvasDashboardTranslate('de', 'addConstraint')).toContain('Constraint');
    expect(canvasDashboardTranslate('pl', 'writeLocked')).toContain('zapis');
    expect(canvasDashboardTranslate('sk', 'removeConstraint')).toBe('Odobrať');
  });
});
