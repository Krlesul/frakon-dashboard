import { describe, expect, it } from 'vitest';
import { resolveCardTag, shouldRemountHostedCard } from './card-host';

describe('resolveCardTag', () => {
  it('maps Home Assistant custom card types to custom element tags', () => {
    expect(resolveCardTag('custom:frakon-light-card')).toBe('frakon-light-card');
  });

  it('rejects unsupported built-in and invalid card types', () => {
    expect(resolveCardTag('entities')).toBeUndefined();
    expect(resolveCardTag(undefined)).toBeUndefined();
  });
});

describe('FRAKON card host remount policy', () => {
  it('remounts only when card configuration changes', () => {
    expect(shouldRemountHostedCard(new Set(['config']))).toBe(true);
    expect(shouldRemountHostedCard(new Set(['hass']))).toBe(false);
    expect(shouldRemountHostedCard(new Set(['hass', 'language']))).toBe(false);
  });
});
