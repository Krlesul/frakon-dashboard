import { describe, expect, it } from 'vitest';
import {
  addDashboardCanvasV2Constraint,
  patchDashboardCanvasV2Constraint,
  removeDashboardCanvasV2Constraint,
} from './dashboard-canvas-v2-constraint-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 500, minHeight: 300, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 20, width: 100, height: 80 } },
      { id: 'c', card: { type: 'custom:c' }, frame: { x: 220, y: 160, width: 100, height: 80 } },
    ],
  };
}

describe('dashboard canvas v2 constraint actions', () => {
  it('adds and applies a constraint with a stable generated id', () => {
    const result = addDashboardCanvasV2Constraint(doc(), {
      kind: 'below', sourceId: 'b', targetId: 'a', gap: 20, enabled: true,
    });
    expect(result.status).toBe('committed');
    expect(result.document.constraints?.[0]?.id).toBe('b-below-a');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.y).toBe(120);
    expect(result.constraintDiagnostics[0]?.status).toBe('applied');
  });

  it('rejects self-referential constraints', () => {
    const result = addDashboardCanvasV2Constraint(doc(), {
      kind: 'below', sourceId: 'a', targetId: 'a', gap: 10,
    });
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('different');
  });

  it('rejects duplicate source-kind-target relations', () => {
    const source = doc();
    source.constraints = [{ id: 'first', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 }];
    const result = addDashboardCanvasV2Constraint(source, {
      kind: 'below', sourceId: 'b', targetId: 'a', gap: 40,
    });
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('Duplicate');
  });

  it('rejects enabled dependency cycles', () => {
    const source = doc();
    source.constraints = [{ id: 'b-to-a', kind: 'below', sourceId: 'b', targetId: 'a', enabled: true }];
    const result = addDashboardCanvasV2Constraint(source, {
      kind: 'right-of', sourceId: 'a', targetId: 'b', enabled: true,
    });
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('cycle');
  });

  it('allows a disabled relation that would otherwise form a cycle', () => {
    const source = doc();
    source.constraints = [{ id: 'b-to-a', kind: 'below', sourceId: 'b', targetId: 'a', enabled: true }];
    const result = addDashboardCanvasV2Constraint(source, {
      kind: 'right-of', sourceId: 'a', targetId: 'b', enabled: false,
    });
    expect(result.status).toBe('committed');
  });

  it('updates kind, gap, priority and enabled state', () => {
    const source = doc();
    source.constraints = [{ id: 'rel', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 }];
    const result = patchDashboardCanvasV2Constraint(source, 'rel', {
      kind: 'right-of', gap: 30, priority: 9, enabled: false,
    });
    expect(result.status).toBe('committed');
    expect(result.document.constraints?.[0]).toMatchObject({ kind: 'right-of', gap: 30, priority: 9, enabled: false });
  });

  it('rolls back a constraint change that creates a collision', () => {
    const source = doc();
    const result = addDashboardCanvasV2Constraint(source, {
      kind: 'align-left', sourceId: 'b', targetId: 'a', enabled: true,
    });
    expect(result.status).toBe('collision');
    expect(result.collisionIds.sort()).toEqual(['a', 'b']);
    expect(result.document.constraints).toBeUndefined();
  });

  it('removes an existing constraint', () => {
    const source = doc();
    source.constraints = [{ id: 'rel', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 }];
    const result = removeDashboardCanvasV2Constraint(source, 'rel');
    expect(result.status).toBe('committed');
    expect(result.document.constraints).toEqual([]);
  });
});
