import { describe, expect, it } from 'vitest';
import { generateDashboardIntelligenceProposals } from './dashboard-intelligence-proposals';
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
    { id: 'camera', x: 0, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-camera-card' } },
    { id: 'light', x: 3, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-light-card' } },
    { id: 'sensor', x: 5, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-sensor-card' } },
  ],
};

describe('dashboard intelligence proposals', () => {
  it('generates the default proposal set', () => {
    const proposals = generateDashboardIntelligenceProposals(document, { device: 'tablet' });

    expect(proposals.map((proposal) => proposal.profile)).toEqual([
      'focus',
      'balanced',
      'compact',
      'wall-display',
    ]);
    expect(proposals.every((proposal) => proposal.document.items.length === document.items.length)).toBe(true);
  });

  it('makes the highest-priority card dominant in focus mode', () => {
    const [focus] = generateDashboardIntelligenceProposals(document, {
      device: 'desktop',
      usage: [{ itemId: 'light', urgent: true }],
    }, ['focus']);
    const light = focus?.document.items.find((item) => item.id === 'light');

    expect(light?.w).toBeGreaterThanOrEqual(8);
    expect(focus?.changedItemIds).toContain('light');
  });

  it('keeps locked cards unchanged', () => {
    const lockedDocument: FrakonDashboardDocument = {
      ...document,
      items: document.items.map((item) => item.id === 'camera' ? { ...item, locked: true } : item),
    };
    const proposals = generateDashboardIntelligenceProposals(lockedDocument, { device: 'wall' });

    for (const proposal of proposals) {
      expect(proposal.document.items.find((item) => item.id === 'camera')).toMatchObject({
        x: 0,
        y: 0,
        w: 3,
        h: 2,
      });
    }
  });
});
