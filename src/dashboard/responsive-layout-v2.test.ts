import { describe, expect, it } from 'vitest';
import {
  createResponsiveCanvasV2Documents,
  deriveDashboardCanvasV2Breakpoint,
  resolveResponsiveCanvasV2Document,
  synchronizeResponsiveCanvasV2SharedState,
} from './responsive-layout-v2';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function source(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'tile', entity: 'light.a' }, frame: { x: 120, y: 40, width: 300, height: 160 }, minWidth: 180 },
      { id: 'b', card: { type: 'tile', entity: 'light.b' }, frame: { x: 600, y: 280, width: 360, height: 180 } },
    ],
    constraints: [{ id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 24 }],
  };
}

describe('responsive canvas v2 layouts', () => {
  it('derives a breakpoint-specific horizontal geometry without changing vertical geometry', () => {
    const result = deriveDashboardCanvasV2Breakpoint(source(), 'mobile', { mobile: 400, tablet: 800, desktop: 1200, wide: 1600 });
    const a = result.document.items[0];
    expect(result.document.breakpoint).toBe('mobile');
    expect(result.document.layout.width).toBe(400);
    expect(a.frame.x).toBeCloseTo(40);
    expect(a.frame.width).toBeCloseTo(100);
    expect(a.frame.y).toBe(40);
    expect(a.frame.height).toBe(160);
    expect(a.minWidth).toBeCloseTo(60);
  });

  it('creates all four breakpoint variants from one native v2 document', () => {
    const documents = createResponsiveCanvasV2Documents(source(), { mobile: 390, tablet: 834, desktop: 1200, wide: 1680 });
    expect(Object.keys(documents).sort()).toEqual(['desktop', 'mobile', 'tablet', 'wide']);
    expect(documents.tablet?.layout.width).toBe(834);
    expect(documents.wide?.breakpoint).toBe('wide');
  });

  it('synchronizes shared card state while preserving target breakpoint frames', () => {
    const documents = createResponsiveCanvasV2Documents(source(), { mobile: 400, tablet: 800, desktop: 1200, wide: 1600 });
    const tabletBefore = structuredClone(documents.tablet!);
    documents.desktop!.items[0].card = { type: 'tile', entity: 'switch.changed' };
    documents.desktop!.items[0].locked = true;
    documents.desktop!.title = 'Changed';
    const synced = synchronizeResponsiveCanvasV2SharedState(documents, 'desktop');
    expect(synced.tablet?.items[0].card).toEqual({ type: 'tile', entity: 'switch.changed' });
    expect(synced.tablet?.items[0].locked).toBe(true);
    expect(synced.tablet?.items[0].frame).toEqual(tabletBefore.items[0].frame);
    expect(synced.tablet?.title).toBe('Changed');
  });

  it('adds newly created source items to other breakpoints without overwriting existing geometry', () => {
    const documents = createResponsiveCanvasV2Documents(source(), { mobile: 400, tablet: 800, desktop: 1200, wide: 1600 });
    const tabletAFrame = structuredClone(documents.tablet!.items[0].frame);
    documents.desktop!.items.push({ id: 'c', card: { type: 'sensor' }, frame: { x: 900, y: 520, width: 240, height: 100 } });
    const synced = synchronizeResponsiveCanvasV2SharedState(documents, 'desktop');
    expect(synced.tablet?.items.find((item) => item.id === 'c')).toBeTruthy();
    expect(synced.tablet?.items.find((item) => item.id === 'a')?.frame).toEqual(tabletAFrame);
  });

  it('removes deleted shared items and their constraints from synchronized breakpoints', () => {
    const documents = createResponsiveCanvasV2Documents(source(), { mobile: 400, tablet: 800, desktop: 1200, wide: 1600 });
    documents.desktop!.items = documents.desktop!.items.filter((item) => item.id !== 'b');
    const synced = synchronizeResponsiveCanvasV2SharedState(documents, 'desktop');
    expect(synced.tablet?.items.map((item) => item.id)).toEqual(['a']);
    expect(synced.tablet?.constraints ?? []).toEqual([]);
  });

  it('derives a missing requested breakpoint from the nearest available variant', () => {
    const documents = { desktop: source() };
    const mobile = resolveResponsiveCanvasV2Document(documents, 'mobile');
    expect(mobile?.breakpoint).toBe('mobile');
    expect(mobile?.layout.width).toBe(390);
  });
});
