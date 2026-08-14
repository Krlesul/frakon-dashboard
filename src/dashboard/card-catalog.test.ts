import { describe, expect, it } from 'vitest';
import { filterCardCatalog, frakonCardCatalog } from './card-catalog';

describe('FRAKON card catalog', () => {
  it('contains unique card types', () => {
    const types = frakonCardCatalog.map((template) => template.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('filters by category', () => {
    const result = filterCardCatalog('', 'security');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((template) => template.category === 'security')).toBe(true);
  });

  it('keeps every visible category backed by at least one card', () => {
    for (const category of ['general', 'lighting', 'climate', 'security', 'media', 'energy', 'vehicle'] as const) {
      expect(filterCardCatalog('', category).length).toBeGreaterThan(0);
    }
    expect(filterCardCatalog('', 'energy').map((template) => template.type)).toContain('custom:frakon-energy-card');
    expect(filterCardCatalog('', 'security').map((template) => template.type)).toContain('custom:frakon-binary-sensor-card');
    expect(filterCardCatalog('', 'general').map((template) => template.type)).toContain('custom:frakon-action-card');
  });

  it('searches names, descriptions and types', () => {
    expect(filterCardCatalog('camera').map((template) => template.type)).toContain('custom:frakon-camera-card');
    expect(filterCardCatalog('brightness').map((template) => template.type)).toContain('custom:frakon-light-card');
    expect(filterCardCatalog('energy').map((template) => template.type)).toContain('custom:frakon-energy-card');
    expect(filterCardCatalog('smoke').map((template) => template.type)).toContain('custom:frakon-binary-sensor-card');
    expect(filterCardCatalog('script').map((template) => template.type)).toContain('custom:frakon-action-card');
  });

  it('creates valid default configurations', () => {
    for (const template of frakonCardCatalog) {
      const config = template.createConfig();
      expect(config.type).toBe(template.type);
      expect(typeof config.entity).toBe('string');
      expect(template.defaultWidth).toBeGreaterThan(0);
      expect(template.defaultHeight).toBeGreaterThan(0);
    }
  });
});
