import { describe, expect, it } from 'vitest';
import { scoreDashboardItemPriority } from './auto-layout-priority';
import type { FrakonGridItem } from './layout-model';

function item(type: string, extra: Partial<FrakonGridItem> = {}): FrakonGridItem {
  return {
    id: 'item',
    card: { type },
    x: 0,
    y: 0,
    w: 3,
    h: 2,
    ...extra,
  };
}

describe('scoreDashboardItemPriority', () => {
  it('ranks cameras above ordinary sensors and gives them a larger preferred size', () => {
    const camera = scoreDashboardItemPriority(item('custom:frakon-camera-card'));
    const sensor = scoreDashboardItemPriority(item('custom:frakon-sensor-card'));
    expect(camera.priority).toBeGreaterThan(sensor.priority ?? 0);
    expect(camera.preferredWidth).toBeGreaterThan(3);
    expect(camera.preferredHeight).toBeGreaterThan(2);
  });

  it('allows an explainable manual priority override', () => {
    const scored = scoreDashboardItemPriority(item('custom:frakon-sensor-card', {
      card: { type: 'custom:frakon-sensor-card', priority: 92 },
    }));
    expect(scored.priority).toBe(92);
    expect(scored.reasons.join(' ')).toContain('manual priority');
  });

  it('explains preservation of locked cards', () => {
    const scored = scoreDashboardItemPriority(item('custom:frakon-card', { locked: true }));
    expect(scored.reasons.join(' ')).toContain('locked cards');
  });
});
