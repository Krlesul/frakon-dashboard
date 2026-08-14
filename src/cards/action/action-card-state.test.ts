import { describe, expect, it } from 'vitest';
import { frakonActionService } from './action-card-state';

describe('FRAKON action service mapping', () => {
  it('maps button-like entities to press', () => {
    expect(frakonActionService('button.restart')).toEqual({ domain: 'button', service: 'press' });
    expect(frakonActionService('input_button.good_night')).toEqual({ domain: 'input_button', service: 'press' });
  });

  it('maps scripts and scenes to turn_on', () => {
    expect(frakonActionService('script.movie_mode')).toEqual({ domain: 'script', service: 'turn_on' });
    expect(frakonActionService('scene.evening')).toEqual({ domain: 'scene', service: 'turn_on' });
  });

  it('rejects domains that have different control semantics', () => {
    expect(frakonActionService('switch.pump')).toBeUndefined();
    expect(frakonActionService('light.kitchen')).toBeUndefined();
  });
});
