import { describe, expect, it } from 'vitest';
import type { HomeAssistant } from '../home-assistant/types';
import { dashboardCanvasV2EntityOptions, filterDashboardCanvasV2EntityOptions } from './dashboard-canvas-v2-entity-options';

const hass = {
  states: {
    'light.kitchen': { entity_id:'light.kitchen', state:'on', attributes:{ friendly_name:'Kitchen' } },
    'light.hall': { entity_id:'light.hall', state:'off', attributes:{} },
    'climate.living_room': { entity_id:'climate.living_room', state:'heat', attributes:{ friendly_name:'Living room' } },
    'sensor.room_temperature': { entity_id:'sensor.room_temperature', state:'21.4', attributes:{ friendly_name:'Room temperature', device_class:'temperature' } },
    'sensor.room_humidity': { entity_id:'sensor.room_humidity', state:'48', attributes:{ friendly_name:'Room humidity', device_class:'humidity' } },
    'sensor.battery': { entity_id:'sensor.battery', state:'90', attributes:{ friendly_name:'Battery', device_class:'battery' } },
  },
} as unknown as HomeAssistant;

describe('dashboard canvas v2 entity options', () => {
  it('filters options to allowed domains and exposes friendly names', () => {
    expect(dashboardCanvasV2EntityOptions(hass, ['light'])).toEqual([
      { entityId:'light.hall', label:'light.hall' },
      { entityId:'light.kitchen', label:'Kitchen · light.kitchen' },
    ]);
  });

  it('filters available entities by device class when requested', () => {
    expect(dashboardCanvasV2EntityOptions(hass, ['sensor'], undefined, ['temperature'])).toEqual([
      { entityId:'sensor.room_temperature', label:'Room temperature · sensor.room_temperature' },
    ]);
    expect(dashboardCanvasV2EntityOptions(hass, ['sensor'], undefined, ['humidity'])).toEqual([
      { entityId:'sensor.room_humidity', label:'Room humidity · sensor.room_humidity' },
    ]);
  });

  it('keeps the currently configured entity even when it is unavailable or lacks the requested device class', () => {
    expect(dashboardCanvasV2EntityOptions(hass, ['camera'], 'camera.driveway')).toEqual([
      { entityId:'camera.driveway', label:'camera.driveway' },
    ]);
    expect(dashboardCanvasV2EntityOptions(hass, ['sensor'], 'sensor.legacy_temperature', ['temperature'])).toEqual([
      { entityId:'sensor.room_temperature', label:'Room temperature · sensor.room_temperature' },
      { entityId:'sensor.legacy_temperature', label:'sensor.legacy_temperature' },
    ].sort((a, b) => a.entityId.localeCompare(b.entityId)));
  });

  it('keeps every configured unavailable entity for multi-select fields', () => {
    expect(dashboardCanvasV2EntityOptions(hass, ['light'], ['light.kitchen', 'light.garden', 'light.garage'])).toEqual([
      { entityId:'light.garage', label:'light.garage' },
      { entityId:'light.garden', label:'light.garden' },
      { entityId:'light.hall', label:'light.hall' },
      { entityId:'light.kitchen', label:'Kitchen · light.kitchen' },
    ]);
  });

  it('searches by friendly name and entity id case-insensitively', () => {
    const options = dashboardCanvasV2EntityOptions(hass, ['light']);
    expect(filterDashboardCanvasV2EntityOptions(options, 'KIT')).toEqual([
      { entityId:'light.kitchen', label:'Kitchen · light.kitchen' },
    ]);
    expect(filterDashboardCanvasV2EntityOptions(options, 'hall')).toEqual([
      { entityId:'light.hall', label:'light.hall' },
    ]);
    expect(filterDashboardCanvasV2EntityOptions(options, '   ')).toEqual(options);
  });
});
