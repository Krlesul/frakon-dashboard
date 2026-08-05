import { describe, expect, it } from 'vitest';
import { resolveCardTag } from './card-host';

describe('resolveCardTag', () => {
  it('maps Home Assistant custom card types to custom element tags', () => {
    expect(resolveCardTag('custom:frakon-light-card')).toBe('frakon-light-card');
  });

  it('rejects unsupported built-in and invalid card types', () => {
    expect(resolveCardTag('entities')).toBeUndefined();
    expect(resolveCardTag(undefined)).toBeUndefined();
  });
});
