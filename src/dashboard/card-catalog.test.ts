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

  it('searches names, descriptions and types', () => {
    expect(filterCardCatalog('camera').map((template) => template.type)).toContain('custom:frakon-camera-card');
    expect(filterCardCatalog('brightness').map((template) => template.type)).toContain('custom:frakon-light-card');
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
