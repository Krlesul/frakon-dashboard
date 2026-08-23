import { describe, expect, it } from 'vitest';
import { frakonFanState, normalizeFanPercentage } from './fan-card-state';

describe('FRAKON fan state helpers', () => {
  it('normalizes on/off and percentage state', () => {
    expect(frakonFanState('on', 42)).toEqual({ on: true, unavailable: false, percentage: 42 });
    expect(frakonFanState('off', 0)).toEqual({ on: false, unavailable: false, percentage: 0 });
  });

  it('marks unknown and unavailable states', () => {
    expect(frakonFanState('unknown', 20).unavailable).toBe(true);
    expect(frakonFanState('unavailable', undefined).unavailable).toBe(true);
  });

  it('clamps requested percentages', () => {
    expect(normalizeFanPercentage(-5)).toBe(0);
    expect(normalizeFanPercentage(42.4)).toBe(42);
    expect(normalizeFanPercentage(140)).toBe(100);
  });
});
