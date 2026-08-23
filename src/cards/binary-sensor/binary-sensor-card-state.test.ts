import { describe, expect, it } from 'vitest';
import { frakonBinarySensorPresentation } from './binary-sensor-card-state';

describe('frakon binary sensor presentation', () => {
  it('maps common opening device classes', () => {
    expect(frakonBinarySensorPresentation('off', 'door')).toEqual({ label: 'Closed', tone: 'inactive', active: false });
    expect(frakonBinarySensorPresentation('on', 'window')).toEqual({ label: 'Open', tone: 'active', active: true });
  });

  it('marks hazard classes as danger when active', () => {
    expect(frakonBinarySensorPresentation('on', 'smoke')).toMatchObject({ label: 'Smoke detected', tone: 'danger' });
    expect(frakonBinarySensorPresentation('on', 'moisture')).toMatchObject({ label: 'Wet', tone: 'danger' });
  });

  it('keeps connectivity active without danger semantics', () => {
    expect(frakonBinarySensorPresentation('on', 'connectivity')).toEqual({ label: 'Connected', tone: 'active', active: true });
  });

  it('handles unavailable and unknown states explicitly', () => {
    expect(frakonBinarySensorPresentation('unavailable', 'motion')).toEqual({ label: 'Unavailable', tone: 'unknown', active: undefined });
    expect(frakonBinarySensorPresentation('mystery', 'motion')).toEqual({ label: 'Unknown', tone: 'unknown', active: undefined });
  });
});
