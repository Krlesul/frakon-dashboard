import { describe, expect, it } from 'vitest';
import type { SupportedLanguage } from '../i18n';
import { frakonCardCatalog } from './card-catalog';
import { cardCatalogLabel } from './card-catalog-i18n';

const languages: SupportedLanguage[] = ['en', 'cs', 'de', 'sk', 'pl'];

describe('FRAKON card catalog i18n', () => {
  it('provides a human label and description for every catalog card in every supported language', () => {
    for (const language of languages) {
      for (const template of frakonCardCatalog) {
        const label = cardCatalogLabel(language, template.type);
        expect(label.name.trim().length).toBeGreaterThan(0);
        expect(label.description.trim().length).toBeGreaterThan(0);
        expect(label.name).not.toBe(template.type);
      }
    }
  });

  it('exposes localized Switch and Lock labels', () => {
    expect(cardCatalogLabel('cs', 'custom:frakon-switch-card').name).toBe('Spínač');
    expect(cardCatalogLabel('de', 'custom:frakon-lock-card').name).toBe('Schloss');
    expect(cardCatalogLabel('pl', 'custom:frakon-lock-card').name).toBe('Zamek');
  });
});
