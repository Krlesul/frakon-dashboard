import { describe, expect, it } from 'vitest';
import { analyzeDashboardIntelligence } from './dashboard-intelligence';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [
    { id: 'camera', x: 0, y: 0, w: 4, h: 3, card: { type: 'custom:frakon-camera-card' } },
    { id: 'light', x: 4, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-light-card' } },
    { id: 'sensor', x: 6, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-sensor-card' } },
  ],
};

describe('dashboard intelligence', () => {
  it('orders cards by explainable priority', () => {
    const analysis = analyzeDashboardIntelligence(document, { device: 'desktop' });

    expect(analysis.orderedItemIds).toEqual(['camera', 'light', 'sensor']);
    expect(analysis.scores[0]?.reasons.length).toBeGreaterThan(0);
  });

  it('promotes frequently used and urgent cards', () => {
    const analysis = analyzeDashboardIntelligence(document, {
      device: 'desktop',
      usage: [{ itemId: 'sensor', interactions30d: 64, urgent: true }],
    });

    expect(analysis.orderedItemIds[0]).toBe('sensor');
    expect(analysis.scores.find((score) => score.itemId === 'sensor')?.tier).toBe('critical');
  });

  it('adapts recommendations to the target device', () => {
    const wall = analyzeDashboardIntelligence(document, { device: 'wall' });
    const mobile = analyzeDashboardIntelligence(document, { device: 'mobile' });
    const wallCamera = wall.scores.find((score) => score.itemId === 'camera');
    const mobileCamera = mobile.scores.find((score) => score.itemId === 'camera');

    expect(wallCamera?.recommendedWidth).toBeGreaterThanOrEqual(6);
    expect(wallCamera?.recommendedHeight).toBeGreaterThanOrEqual(5);
    expect(mobileCamera?.recommendedWidth).toBeLessThanOrEqual(4);
  });

  it('uses daypart context without overriding explicit urgency', () => {
    const analysis = analyzeDashboardIntelligence(document, {
      device: 'tablet',
      daypart: 'evening',
      usage: [{ itemId: 'sensor', urgent: true }],
    });

    expect(analysis.orderedItemIds[0]).toBe('sensor');
    expect(analysis.scores.find((score) => score.itemId === 'light')?.reasons)
      .toContain('evening context adds 8 points');
  });
});
