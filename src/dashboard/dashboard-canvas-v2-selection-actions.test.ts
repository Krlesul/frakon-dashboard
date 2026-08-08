import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: false, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 130, width: 140, height: 60 } },
      { id: 'c', card: { type: 'custom:c' }, frame: { x: 430, y: 20, width: 100, height: 80 }, locked: true },
    ],
  };
}

function distributionDoc(): FrakonDashboardDocumentV2 {
  const source = doc();
  source.items = [
    { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 80, height: 60 } },
    { id: 'b', card: { type: 'custom:b' }, frame: { x: 180, y: 110, width: 100, height: 80 } },
    { id: 'c', card: { type: 'custom:c' }, frame: { x: 440, y: 220, width: 120, height: 40 } },
  ];
  return source;
}

describe('dashboard canvas v2 selection actions', () => {
  it('aligns selected unlocked items to the shared top edge', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'b'], 'align-top');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.y).toBe(20);
  });

  it('matches width to the first selected item', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'b'], 'match-width');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.width).toBe(100);
  });

  it('leaves locked selected items unchanged', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'c'], 'align-left');
    expect(result.document.items.find((item) => item.id === 'c')?.frame.x).toBe(430);
  });

  it('rejects an action that would collide items', () => {
    const source = doc();
    source.items[1].frame = { x: 20, y: 130, width: 100, height: 60 };
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b'], 'align-top');
    expect(result.status).toBe('collision');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.y).toBe(130);
  });

  it('requires at least two selected items', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a'], 'align-left');
    expect(result.status).toBe('invalid');
  });

  it('distributes three unlocked items by horizontal centers while keeping endpoints fixed', () => {
    const source = distributionDoc();
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b', 'c'], 'distribute-horizontal');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(20);
    expect(result.document.items.find((item) => item.id === 'c')?.frame.x).toBe(440);
    expect(result.document.items.find((item) => item.id === 'b')?.frame.x).toBe(220);
  });

  it('creates equal horizontal gaps between differently sized items', () => {
    const source = distributionDoc();
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b', 'c'], 'equal-gap-horizontal');
    expect(result.status).toBe('committed');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => result.document.items.find((item) => item.id === id)!);
    const gap1 = b.frame.x - (a.frame.x + a.frame.width);
    const gap2 = c.frame.x - (b.frame.x + b.frame.width);
    expect(gap1).toBeCloseTo(gap2, 6);
  });

  it('creates equal vertical gaps between differently sized items', () => {
    const source = distributionDoc();
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b', 'c'], 'equal-gap-vertical');
    expect(result.status).toBe('committed');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => result.document.items.find((item) => item.id === id)!);
    const sorted = [a, b, c].sort((left, right) => left.frame.y - right.frame.y);
    const gap1 = sorted[1].frame.y - (sorted[0].frame.y + sorted[0].frame.height);
    const gap2 = sorted[2].frame.y - (sorted[1].frame.y + sorted[1].frame.height);
    expect(gap1).toBeCloseTo(gap2, 6);
  });

  it('requires at least three unlocked items for distribution', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'b'], 'distribute-horizontal');
    expect(result.status).toBe('invalid');
  });

  it('rejects equal gaps when selected widths cannot fit between fixed endpoints', () => {
    const source = distributionDoc();
    source.items[0].frame = { x: 20, y: 20, width: 220, height: 60 };
    source.items[1].frame = { x: 180, y: 110, width: 220, height: 80 };
    source.items[2].frame = { x: 440, y: 220, width: 120, height: 40 };
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b', 'c'], 'equal-gap-horizontal');
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('horizontal space');
  });
});
