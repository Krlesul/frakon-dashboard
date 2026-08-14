import { describe, expect, it } from 'vitest';
import { frakonLockActionForState } from './lock/lock-card';
import { frakonSwitchActionForState } from './switch/switch-card';

describe('FRAKON Switch and Lock action guards', () => {
  it('maps only stable switch states to the opposite service', () => {
    expect(frakonSwitchActionForState('on')).toBe('turn_off');
    expect(frakonSwitchActionForState('off')).toBe('turn_on');
    expect(frakonSwitchActionForState('unknown')).toBeUndefined();
    expect(frakonSwitchActionForState('unavailable')).toBeUndefined();
  });

  it('maps only stable lock states to the opposite service', () => {
    expect(frakonLockActionForState('locked')).toBe('unlock');
    expect(frakonLockActionForState('unlocked')).toBe('lock');
    expect(frakonLockActionForState('locking')).toBeUndefined();
    expect(frakonLockActionForState('unlocking')).toBeUndefined();
    expect(frakonLockActionForState('jammed')).toBeUndefined();
    expect(frakonLockActionForState('unavailable')).toBeUndefined();
  });
});
