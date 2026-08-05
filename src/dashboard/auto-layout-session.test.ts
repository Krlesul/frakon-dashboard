import { describe, expect, it } from 'vitest';
import { findCollisions, type FrakonDashboardDocument } from './layout-model';
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
    { id: 'alarm', card: { type: 'custom:frakon-card' }, x: 4, y: 0, w: 3, h: 2 },
    { id: 'locked', card: { type: 'custom:frakon-sensor-card' }, x: 9, y: 0, w: 3, h: 2, locked: true },
  ],
};

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
});
