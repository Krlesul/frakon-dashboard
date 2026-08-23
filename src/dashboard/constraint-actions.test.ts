import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import {
  addConstraint,
  removeConstraint,
  setConstraintEnabled,
  setConstraintPriority,
  updateConstraint,
} from './constraint-actions';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'test',
  title: 'Test',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 64,
  gap: 12,
  items: [
    { id: 'a', card: {}, x: 0, y: 0, w: 2, h: 2 },
    { id: 'b', card: {}, x: 3, y: 0, w: 2, h: 2 },
  ],
};

const constraint = {
  id: 'a-right-of-b',
  kind: 'right-of' as const,
  sourceId: 'a',
  targetId: 'b',
  gap: 2,
};

describe('dashboard constraint actions', () => {
  it('adds and normalizes a constraint', () => {
    const result = addConstraint(document, { ...constraint, priority: 4.6 });
    expect(result.constraints).toEqual([{ ...constraint, priority: 5, enabled: true }]);
  });

  it('rejects duplicate ids and self references', () => {
    const withConstraint = addConstraint(document, constraint);
    expect(() => addConstraint(withConstraint, constraint)).toThrow(/Duplicate/);
    expect(() => addConstraint(document, { ...constraint, id: 'self', targetId: 'a' })).toThrow(/own source/);
  });

  it('updates, enables and prioritizes constraints', () => {
    const withConstraint = addConstraint(document, constraint);
    const changed = updateConstraint(withConstraint, constraint.id, { gap: 8 });
    const disabled = setConstraintEnabled(changed, constraint.id, false);
    const prioritized = setConstraintPriority(disabled, constraint.id, 90.4);
    expect(prioritized.constraints?.[0]).toMatchObject({ gap: 8, enabled: false, priority: 90 });
  });

  it('removes a constraint', () => {
    const withConstraint = addConstraint(document, constraint);
    expect(removeConstraint(withConstraint, constraint.id).constraints).toEqual([]);
  });
});
