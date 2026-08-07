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
  constraints: [{ id: 'below', kind: 'below', sourceId: 'a', targetId: 'b', gap: 1 }],
  items: [
    { id: 'a', x: 0, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:a' } },
    { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
  ],
};

describe('dashboard v2 migration preview', () => {
  it('describes a non-persisting migration candidate before enabling v2 writes', () => {
    const preview = createDashboardV2MigrationPreview(document, 430);
    expect(preview).toMatchObject({
      sourceVersion: 1,
      targetVersion: 2,
      safeToPersist: false,
      itemCount: 2,
      lockedItemCount: 1,
      constraintCount: 1,
      canvasWidth: 430,
    });
    expect(preview.warnings).toEqual([
      'constraints-preserved',
      'locked-items-preserved',
      'responsive-layout-needs-review',
    ]);
    expect(preview.candidate.version).toBe(2);
  });
});
