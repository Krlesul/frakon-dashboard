import { describe, expect, it } from 'vitest';
import { frakonLockUnlockIntent } from './lock-card-safety';

describe('FRAKON Lock unlock confirmation policy', () => {
  it('requires confirmation by default', () => {
    expect(frakonLockUnlockIntent(undefined, false)).toBe('confirm');
    expect(frakonLockUnlockIntent(undefined, true)).toBe('execute');
  });

  it('allows an explicit opt-out for trusted installations', () => {
    expect(frakonLockUnlockIntent(false, false)).toBe('execute');
    expect(frakonLockUnlockIntent(false, true)).toBe('execute');
  });

  it('keeps explicit confirmation enabled', () => {
    expect(frakonLockUnlockIntent(true, false)).toBe('confirm');
    expect(frakonLockUnlockIntent(true, true)).toBe('execute');
  });
});
