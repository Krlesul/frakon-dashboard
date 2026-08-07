import { describe, expect, it } from 'vitest';
import { emergencyTitle, humanizeEntityId, presentDashboardEmergency } from './dashboard-emergency-presentation';
import type { DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

describe('Emergency Focus presentation', () => {
  it('turns smoke metadata into a concise user-facing alert', () => {
    const target: DashboardEmergencyFocusTarget = {
      itemId: 'smoke',
      item: { id: 'smoke', x: 0, y: 0, w: 3, h: 2, card: { type: 'sensor' } },
      severity: 'critical',
      reasons: ['binary_sensor.kitchen_smoke reports an active smoke condition'],
      sourceEntityIds: ['binary_sensor.kitchen_smoke'],
    };
    expect(presentDashboardEmergency(target)).toEqual({
      title: 'Smoke detected',
      sourceLabel: 'Kitchen Smoke',
      technicalReason: 'binary_sensor.kitchen_smoke reports an active smoke condition',
      sourceEntityId: 'binary_sensor.kitchen_smoke',
    });
  });

  it('maps known safety conditions to user-facing titles', () => {
    expect(emergencyTitle('binary_sensor.gas reports an active gas condition')).toBe('Gas detected');
    expect(emergencyTitle('binary_sensor.leak reports an active moisture condition')).toBe('Water leak detected');
    expect(emergencyTitle('alarm_control_panel.home is in alarm state triggered')).toBe('Security alarm active');
  });

  it('humanizes Home Assistant entity ids', () => {
    expect(humanizeEntityId('binary_sensor.kitchen_smoke')).toBe('Kitchen Smoke');
  });
});
