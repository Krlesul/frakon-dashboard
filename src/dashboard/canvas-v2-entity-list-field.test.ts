import { describe, expect, it } from 'vitest';
import { toggleDashboardCanvasV2EntityList } from './canvas-v2-entity-list-field';

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
});
