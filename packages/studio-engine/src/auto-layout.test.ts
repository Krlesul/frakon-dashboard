import { describe, expect, it } from 'vitest';
import {
  generateAutoLayoutProposal,
  nextAutoLayoutProposal,
  orderAutoLayoutItems,
  strategyForVariant,
  type AutoLayoutItem,
} from './auto-layout';

const items: AutoLayoutItem[] = [
  { id: 'camera', x: 0, y: 0, w: 4, h: 3, priority: 95, semanticGroup: 'security', preferredWidth: 5, preferredHeight: 4 },
  { id: 'energy', x: 4, y: 0, w: 4, h: 3, priority: 80, semanticGroup: 'energy', preferredWidth: 5, preferredHeight: 4 },
  { id: 'lights', x: 8, y: 0, w: 3, h: 2, priority: 50, semanticGroup: 'lighting' },
  { id: 'weather', x: 0, y: 3, w: 3, h: 2, priority: 20, semanticGroup: 'status' },
];

function overlap(a: AutoLayoutItem, b: AutoLayoutItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe('automatic layout proposals', () => {
  it('cycles through four distinct product strategies', () => {
    expect([0, 1, 2, 3, 4].map(strategyForVariant)).toEqual([
      'priority-first', 'balanced', 'compact', 'focus', 'priority-first',
    ]);
  });

  it('keeps semantic groups together in priority-oriented modes', () => {
    const grouped: AutoLayoutItem[] = [
      { id: 'security-high', x: 0, y: 0, w: 2, h: 2, priority: 100, semanticGroup: 'security' },
      { id: 'security-low', x: 0, y: 0, w: 2, h: 2, priority: 60, semanticGroup: 'security' },
      { id: 'energy-high', x: 0, y: 0, w: 2, h: 2, priority: 80, semanticGroup: 'energy' },
      { id: 'energy-low', x: 0, y: 0, w: 2, h: 2, priority: 40, semanticGroup: 'energy' },
    ];
    expect(orderAutoLayoutItems(grouped, 'priority-first').map((item) => item.id)).toEqual([
      'security-high', 'security-low', 'energy-high', 'energy-low',
    ]);
  });

  it('interleaves semantic groups in balanced mode for fair first-screen representation', () => {
    const grouped: AutoLayoutItem[] = [
      { id: 'security-high', x: 0, y: 0, w: 2, h: 2, priority: 100, semanticGroup: 'security' },
      { id: 'security-low', x: 0, y: 0, w: 2, h: 2, priority: 60, semanticGroup: 'security' },
      { id: 'energy-high', x: 0, y: 0, w: 2, h: 2, priority: 80, semanticGroup: 'energy' },
      { id: 'energy-low', x: 0, y: 0, w: 2, h: 2, priority: 40, semanticGroup: 'energy' },
    ];
    expect(orderAutoLayoutItems(grouped, 'balanced').map((item) => item.id)).toEqual([
      'security-high', 'energy-high', 'security-low', 'energy-low',
    ]);
    expect(orderAutoLayoutItems(grouped, 'comfortable')).toEqual(orderAutoLayoutItems(grouped, 'balanced'));
  });

  it('produces deterministic proposals for the same input', () => {
    expect(generateAutoLayoutProposal(items, { columns: 12, variant: 3 }))
      .toEqual(generateAutoLayoutProposal(items, { columns: 12, variant: 3 }));
  });

  it('keeps all cards within columns and collision free', () => {
    const proposal = generateAutoLayoutProposal(items, { columns: 12, variant: 0 });
    for (const item of proposal.items) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(12);
    }
    for (let index = 0; index < proposal.items.length; index += 1) {
      for (let other = index + 1; other < proposal.items.length; other += 1) {
        expect(overlap(proposal.items[index], proposal.items[other])).toBe(false);
      }
    }
  });

  it('preserves locked card geometry', () => {
    const locked = { id: 'gate', x: 0, y: 0, w: 4, h: 3, locked: true, priority: 100 };
    const proposal = generateAutoLayoutProposal([locked, ...items], { columns: 12, variant: 2 });
    expect(proposal.items.find((item) => item.id === 'gate')).toMatchObject(locked);
  });

  it('makes the most important card a hero in focus mode', () => {
    const proposal = generateAutoLayoutProposal(items, { columns: 12, strategy: 'focus' });
    const camera = proposal.items.find((item) => item.id === 'camera');
    expect(camera?.w).toBeGreaterThanOrEqual(8);
    expect(camera?.h).toBeGreaterThanOrEqual(5);
  });

  it('generates the next proposal variant', () => {
    expect(nextAutoLayoutProposal(items, 12, 1).variant).toBe(2);
    expect(nextAutoLayoutProposal(items, 12, 1).strategy).toBe('compact');
  });
});
