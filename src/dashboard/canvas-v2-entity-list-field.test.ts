import { describe, expect, it } from 'vitest';
import { filterDashboardCanvasV2EntityOptions, toggleDashboardCanvasV2EntityList } from './canvas-v2-entity-list-field';

describe('canvas v2 multi-entity checklist', () => {
  it('adds, removes, trims and deduplicates entity ids deterministically', () => {
    expect(toggleDashboardCanvasV2EntityList([' light.kitchen ', 'light.kitchen', 'light.hall'], 'light.garage', true)).toEqual([
      'light.garage', 'light.hall', 'light.kitchen',
    ]);
    expect(toggleDashboardCanvasV2EntityList(['light.kitchen', 'light.hall'], 'light.kitchen', false)).toEqual(['light.hall']);
  });

  it('keeps unavailable configured ids until the user explicitly removes them', () => {
    expect(toggleDashboardCanvasV2EntityList(['light.unavailable'], 'light.kitchen', true)).toEqual([
      'light.kitchen', 'light.unavailable',
    ]);
  });

  it('filters by friendly name or entity id without mutating source options', () => {
    const options = [
      { entityId:'light.kitchen', label:'Kitchen · light.kitchen' },
      { entityId:'light.hall', label:'Hall · light.hall' },
    ];
    expect(filterDashboardCanvasV2EntityOptions(options, 'kit')).toEqual([options[0]]);
    expect(filterDashboardCanvasV2EntityOptions(options, 'light.hall')).toEqual([options[1]]);
    expect(options).toHaveLength(2);
  });
});
