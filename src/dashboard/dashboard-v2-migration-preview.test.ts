import { describe, expect, it } from 'vitest';
import { createDashboardV2MigrationPreview } from './dashboard-v2-migration-preview';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  constraints: [
    { id: 'below', kind: 'below', sourceId: 'a', targetId: 'b', gap: 1 },
    { id: 'hidden-left-a', kind: 'align-left', sourceId: 'hidden', targetId: 'a' },
  ],
  items: [
    { id: 'a', x: 0, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:a' } },
    { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
    { id: 'hidden', x: 0, y: 4, w: 1, h: 1, hidden: true, card: { type: 'custom:hidden' } },
  ],
};

describe('dashboard v2 migration preview', () => {
  it('describes a non-persisting migration candidate before enabling v2 writes', () => {
    const preview = createDashboardV2MigrationPreview(document, 430);
    expect(preview).toMatchObject({
      sourceVersion: 1,
      targetVersion: 2,
      safeToPersist: false,
      itemCount: 3,
      migratedItemCount: 2,
      hiddenItemCount: 1,
      lockedItemCount: 1,
      constraintCount: 2,
      canvasWidth: 430,
    });
    expect(preview.warnings).toEqual([
      'hidden-items-omitted',
      'constraints-preserved',
      'locked-items-preserved',
      'responsive-layout-needs-review',
    ]);
    expect(preview.candidate.version).toBe(2);
    expect(preview.candidate.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(preview.candidate.constraints?.map((constraint) => constraint.id)).toEqual(['below']);
  });

  it('never promotes a hidden v1 card into a visible Canvas v2 candidate', () => {
    const preview = createDashboardV2MigrationPreview(document, 430);
    expect(preview.candidate.items.some((item) => item.id === 'hidden')).toBe(false);
    expect(preview.safeToPersist).toBe(false);
  });
});
