import { describe, expect, it } from 'vitest';
import { solveConstraints, type ConstraintItem, type LayoutConstraint } from './constraints';

const items: ConstraintItem[] = [
  { id: 'target', x: 100, y: 80, width: 200, height: 120 },
  { id: 'source', x: 10, y: 10, width: 80, height: 40 },
];

describe('solveConstraints', () => {
  it('aligns and positions items relative to another item', () => {
    const constraints: LayoutConstraint[] = [
      { id: 'left', kind: 'align-left', sourceId: 'source', targetId: 'target' },
      { id: 'below', kind: 'below', sourceId: 'source', targetId: 'target', gap: 16 },
    ];
    const result = solveConstraints(items, constraints);
    expect(result.items.find((item) => item.id === 'source')).toMatchObject({ x: 100, y: 216 });
    expect(result.diagnostics.every((entry) => entry.status === 'applied')).toBe(true);
  });

  it('matches dimensions and respects priorities deterministically', () => {
    const constraints: LayoutConstraint[] = [
      { id: 'low', kind: 'align-left', sourceId: 'source', targetId: 'target', priority: 1 },
      { id: 'width', kind: 'match-width', sourceId: 'source', targetId: 'target', priority: 10 },
    ];
    const result = solveConstraints(items, constraints);
    expect(result.items.find((item) => item.id === 'source')).toMatchObject({ x: 100, width: 200 });
  });

  it('does not move a locked source item', () => {
    const locked = items.map((item) => item.id === 'source' ? { ...item, locked: true } : item);
    const result = solveConstraints(locked, [
      { id: 'right', kind: 'right-of', sourceId: 'source', targetId: 'target', gap: 20 },
    ]);
    expect(result.items.find((item) => item.id === 'source')?.x).toBe(10);
    expect(result.diagnostics[0].status).toBe('locked');
  });

  it('reports missing references without throwing', () => {
    const result = solveConstraints(items, [
      { id: 'missing', kind: 'below', sourceId: 'unknown', targetId: 'target' },
    ]);
    expect(result.diagnostics[0].status).toBe('missing-item');
    expect(result.items).toEqual(items);
  });

  it('ignores disabled constraints', () => {
    const result = solveConstraints(items, [
      { id: 'disabled', kind: 'align-left', sourceId: 'source', targetId: 'target', enabled: false },
    ]);
    expect(result.items).toEqual(items);
    expect(result.diagnostics).toEqual([]);
  });
});
