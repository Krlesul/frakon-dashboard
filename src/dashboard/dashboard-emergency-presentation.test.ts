import { describe, expect, it } from 'vitest';
import { emergencyKind, emergencyTitle, humanizeEntityId, presentDashboardEmergency } from './dashboard-emergency-presentation';
import type { DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

const target: DashboardEmergencyFocusTarget = {
  itemId: 'smoke',
  item: { id: 'smoke', x: 0, y: 0, w: 3, h: 2, card: { type: 'sensor' } },
  severity: 'critical',
  reasons: ['binary_sensor.kitchen_smoke reports an active smoke condition'],
  sourceEntityIds: ['binary_sensor.kitchen_smoke'],
  sourceEntityLabels: { 'binary_sensor.kitchen_smoke': 'Kouřové čidlo kuchyň' },
};

describe('Emergency Focus presentation', () => {
  it('turns smoke metadata into a concise user-facing alert using friendly_name', () => {
    expect(presentDashboardEmergency(target)).toEqual({
      title: 'Smoke detected',
      kind: 'smoke',
      icon: '◉',
      sourceLabel: 'Kouřové čidlo kuchyň',
      technicalReason: 'binary_sensor.kitchen_smoke reports an active smoke condition',
      sourceEntityId: 'binary_sensor.kitchen_smoke',
    });
  });

  it('localizes known safety conditions', () => {
    expect(presentDashboardEmergency(target, 'cs-CZ').title).toBe('Detekován kouř');
    expect(emergencyTitle('binary_sensor.gas reports an active gas condition', 'de')).toBe('Gas erkannt');
    expect(emergencyTitle('binary_sensor.leak reports an active moisture condition', 'sk')).toBe('Detegovaný únik vody');
    expect(emergencyTitle('alarm_control_panel.home is in alarm state triggered', 'pl')).toBe('Aktywny alarm bezpieczeństwa');
  });

  it('classifies visual event types independently of locale', () => {
    expect(emergencyKind('binary_sensor.smoke reports an active smoke condition')).toBe('smoke');
    expect(emergencyKind('binary_sensor.gas reports an active gas condition')).toBe('gas');
    expect(emergencyKind('binary_sensor.leak reports an active moisture condition')).toBe('water');
    expect(emergencyKind('alarm_control_panel.home is in alarm state triggered')).toBe('alarm');
    expect(emergencyKind('sensor.ups_battery has a low battery')).toBe('battery');
    expect(emergencyKind('climate.home reports a climate problem')).toBe('climate');
    expect(emergencyKind('camera.gate is unavailable')).toBe('unavailable');
  });

  it('humanizes Home Assistant entity ids when friendly_name is unavailable', () => {
    expect(humanizeEntityId('binary_sensor.kitchen_smoke')).toBe('Kitchen Smoke');
  });
});
