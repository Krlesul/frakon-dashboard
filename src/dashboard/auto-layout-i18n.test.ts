import { describe, expect, it } from 'vitest';
import { autoLayoutTranslate } from './auto-layout-i18n';

describe('automatic layout translations', () => {
  it('provides English editor labels', () => {
    expect(autoLayoutTranslate('en', 'autoLayout')).toBe('Auto arrange');
    expect(autoLayoutTranslate('en', 'nextProposal')).toBe('Next proposal');
  });

  it('provides Czech workflow labels', () => {
    expect(autoLayoutTranslate('cs', 'autoLayout')).toBe('Automaticky uspořádat');
    expect(autoLayoutTranslate('cs', 'applyProposal')).toBe('Použít návrh');
    expect(autoLayoutTranslate('cs', 'revertOriginal')).toBe('Vrátit původní');
  });

  it('provides German, Slovak and Polish labels', () => {
    expect(autoLayoutTranslate('de', 'nextProposal')).toBe('Nächster Vorschlag');
    expect(autoLayoutTranslate('sk', 'autoLayout')).toBe('Automaticky usporiadať');
    expect(autoLayoutTranslate('pl', 'applyProposal')).toBe('Zastosuj propozycję');
  });
});
