import { describe, expect, it } from 'vitest';
import { findCollisions, type FrakonBreakpoint, type FrakonDashboardDocument } from './layout-model';
import { scoreDashboardItemPriority } from './auto-layout-priority';
import { DashboardAutoLayoutSession } from './auto-layout-session';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    { id: 'camera', card: { type: 'custom:frakon-camera-card' }, x: 0, y: 0, w: 4, h: 3 },
    { id: 'alarm', card: { type: 'custom:frakon-card', priority: 80 }, x: 4, y: 0, w: 3, h: 2 },
    { id: 'energy', card: { type: 'custom:frakon-energy-card' }, x: 0, y: 3, w: 4, h: 3 },
    { id: 'room', card: { type: 'custom:frakon-room-card' }, x: 4, y: 3, w: 4, h: 3 },
    { id: 'locked', card: { type: 'custom:frakon-sensor-card' }, x: 9, y: 0, w: 3, h: 2, locked: true },
  ],
};

function signature(proposal: FrakonDashboardDocument): string {
  return proposal.items.map((item) => `${item.id}:${item.x},${item.y},${item.w},${item.h}`).join('|');
}

describe('DashboardAutoLayoutSession', () => {
  it('cycles through deterministic layout proposals', () => {
    const session = new DashboardAutoLayoutSession(document, (item) => ({
      priority: item.id === 'camera' ? 100 : item.id === 'alarm' ? 80 : 10,
    }));
    const first = session.next();
    const second = session.next();
    expect(first.variant).toBe(0);
    expect(second.variant).toBe(1);
    expect(first.strategy).not.toBe(second.strategy);
    expect(findCollisions(first.proposal.items)).toHaveLength(0);
    expect(findCollisions(second.proposal.items)).toHaveLength(0);
  });

  it('preserves locked items and can restore the original document', () => {
    const session = new DashboardAutoLayoutSession(document);
    const preview = session.next();
    expect(preview.proposal.items.find((item) => item.id === 'locked'))
      .toMatchObject({ x: 9, y: 0, w: 3, h: 2, locked: true });
    expect(session.revert()).toEqual(document);
  });

  it('keeps hidden card geometry fixed while arranging visible cards around it', () => {
    const hiddenDocument: FrakonDashboardDocument = {
      ...document,
      items: [
        ...document.items,
        { id: 'hidden', card: { type: 'custom:frakon-room-card' }, x: 8, y: 5, w: 4, h: 3, hidden: true },
      ],
    };
    const preview = new DashboardAutoLayoutSession(hiddenDocument, scoreDashboardItemPriority).preview(3);
    expect(preview.proposal.items.find((item) => item.id === 'hidden'))
      .toMatchObject({ x: 8, y: 5, w: 4, h: 3, hidden: true });
    expect(findCollisions(preview.proposal.items)).toHaveLength(0);
  });

  it('keeps scaled hidden geometry in responsive previews instead of dropping the layer', () => {
    const hiddenDocument: FrakonDashboardDocument = {
      ...document,
      items: [
        ...document.items,
        { id: 'hidden', card: { type: 'custom:frakon-room-card' }, x: 6, y: 7, w: 3, h: 2, hidden: true },
      ],
    };
    const preview = new DashboardAutoLayoutSession(hiddenDocument, scoreDashboardItemPriority)
      .previewBreakpoint('mobile', 0);
    expect(preview.proposal.columns).toBe(4);
    expect(preview.proposal.items.find((item) => item.id === 'hidden'))
      .toMatchObject({ x: 2, y: 7, w: 1, h: 2, hidden: true });
    expect(findCollisions(preview.proposal.items)).toHaveLength(0);
  });

  it('returns independent documents for preview, apply and revert', () => {
    const session = new DashboardAutoLayoutSession(document);
    const preview = session.preview(3);
    const applied = session.apply(preview);
    applied.items[0].card.type = 'changed';
    expect(preview.proposal.items[0].card.type).not.toBe('changed');
    expect(session.revert()).toEqual(document);
  });

  it('uses metadata to enlarge high-priority focus cards', () => {
    const session = new DashboardAutoLayoutSession(document, (item) => ({
      priority: item.id === 'camera' ? 100 : 0,
      preferredWidth: item.id === 'camera' ? 8 : undefined,
      preferredHeight: item.id === 'camera' ? 5 : undefined,
    }));
    const focus = session.preview(3);
    expect(focus.strategy).toBe('focus');
    expect(focus.proposal.items.find((item) => item.id === 'camera'))
      .toMatchObject({ w: 8, h: 5 });
  });

  it('generates at least three distinct collision-free proposals for every supported breakpoint', () => {
    const session = new DashboardAutoLayoutSession(document, scoreDashboardItemPriority);
    const sets = session.responsiveProposalSet(3);
    const breakpoints: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

    for (const breakpoint of breakpoints) {
      const previews = sets[breakpoint];
      expect(previews).toHaveLength(3);
      expect(new Set(previews.map((preview) => signature(preview.proposal))).size).toBe(3);
      for (const preview of previews) {
        expect(preview.breakpoint).toBe(breakpoint);
        expect(findCollisions(preview.proposal.items)).toHaveLength(0);
        for (const item of preview.proposal.items) {
          expect(item.x).toBeGreaterThanOrEqual(0);
          expect(item.x + item.w).toBeLessThanOrEqual(preview.proposal.columns);
        }
      }
    }
  });

  it('keeps responsive proposal generation deterministic', () => {
    const first = new DashboardAutoLayoutSession(document, scoreDashboardItemPriority).responsiveProposalSet(3);
    const second = new DashboardAutoLayoutSession(document, scoreDashboardItemPriority).responsiveProposalSet(3);
    expect(first).toEqual(second);
  });
});
