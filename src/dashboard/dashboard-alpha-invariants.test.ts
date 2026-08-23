import { describe, expect, it } from 'vitest';
import { DashboardAutoLayoutSession } from './auto-layout-session';
import { scoreDashboardItemPriority } from './auto-layout-priority';
import { createDashboardV2MigrationPreview } from './dashboard-v2-migration-preview';
import { DashboardStorageController } from './dashboard-storage-controller';
import { MemoryDashboardStorageAdapter } from './dashboard-storage';
import { exportDashboard, importDashboard } from './layout-store';
import { findCollisions, type FrakonDashboardDocument } from './layout-model';
import { documentForBreakpoint } from './responsive-layout';

function canonicalDocument(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'alpha-invariants',
    title: 'Alpha invariants',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    items: [
      {
        id: 'front-camera',
        x: 8,
        y: 6,
        w: 4,
        h: 3,
        card: { type: 'custom:frakon-camera-card', priority: 100 },
      },
      {
        id: 'hidden-room',
        x: 4,
        y: 5,
        w: 3,
        h: 2,
        hidden: true,
        card: { type: 'custom:frakon-room-card' },
      },
      {
        id: 'back-sensor',
        x: 0,
        y: 0,
        w: 3,
        h: 2,
        card: { type: 'custom:frakon-sensor-card' },
      },
    ],
    constraints: [
      {
        id: 'sensor-left-camera',
        kind: 'right-of',
        sourceId: 'front-camera',
        targetId: 'back-sensor',
        gap: 1,
        priority: 30,
      },
      {
        id: 'hidden-align-camera',
        kind: 'align-left',
        sourceId: 'hidden-room',
        targetId: 'front-camera',
        priority: 20,
      },
    ],
  };
}

describe('FRAKON Dashboard alpha document invariants', () => {
  it('preserves canonical v1 identity through export/import and storage reload', async () => {
    const source = canonicalDocument();
    const imported = importDashboard(exportDashboard(source));

    expect(imported.items).toEqual(source.items);
    expect(imported.items.map((item) => item.id)).toEqual([
      'front-camera',
      'hidden-room',
      'back-sensor',
    ]);
    expect(imported.constraints).toEqual(source.constraints);

    const storage = new DashboardStorageController(new MemoryDashboardStorageAdapter());
    await storage.save(imported);
    const loaded = await storage.load(source.id);

    expect(loaded?.items).toEqual(source.items);
    expect(loaded?.constraints).toEqual(source.constraints);
    expect(findCollisions(loaded?.items ?? [])).toHaveLength(0);
  });

  it('uses different hidden semantics for runtime and editor responsive projections', () => {
    const source = canonicalDocument();
    const runtime = documentForBreakpoint(source, 'mobile');
    const editor = documentForBreakpoint(source, 'mobile', undefined, { includeHidden: true });

    expect(runtime.items.map((item) => item.id)).toEqual(['front-camera', 'back-sensor']);
    expect(runtime.constraints?.map((constraint) => constraint.id)).toEqual(['sensor-left-camera']);

    expect(editor.items.map((item) => item.id)).toEqual([
      'front-camera',
      'hidden-room',
      'back-sensor',
    ]);
    expect(editor.items.find((item) => item.id === 'hidden-room')).toMatchObject({
      x: 1,
      y: 5,
      w: 1,
      h: 2,
      hidden: true,
    });
    expect(editor.constraints?.map((constraint) => constraint.id)).toEqual([
      'sensor-left-camera',
      'hidden-align-camera',
    ]);
    expect(source).toEqual(canonicalDocument());
  });

  it('keeps hidden geometry reserved in responsive Automatic Designer proposals', () => {
    const source = canonicalDocument();
    const preview = new DashboardAutoLayoutSession(source, scoreDashboardItemPriority)
      .previewBreakpoint('mobile', 0);

    expect(preview.proposal.items.map((item) => item.id)).toEqual([
      'front-camera',
      'hidden-room',
      'back-sensor',
    ]);
    expect(preview.proposal.items.find((item) => item.id === 'hidden-room')).toMatchObject({
      x: 1,
      y: 5,
      w: 1,
      h: 2,
      hidden: true,
    });
    expect(findCollisions(preview.proposal.items)).toHaveLength(0);
  });

  it('never exposes a hidden v1 layer in the read-only v2 migration candidate', () => {
    const source = canonicalDocument();
    const preview = createDashboardV2MigrationPreview(source, 1200);

    expect(preview.safeToPersist).toBe(false);
    expect(preview.hiddenItemCount).toBe(1);
    expect(preview.migratedItemCount).toBe(2);
    expect(preview.warnings).toContain('hidden-items-omitted');
    expect(preview.candidate.items.map((item) => item.id)).toEqual([
      'front-camera',
      'back-sensor',
    ]);
    expect(preview.candidate.constraints?.map((constraint) => constraint.id)).toEqual([
      'sensor-left-camera',
    ]);
    expect(source.items.find((item) => item.id === 'hidden-room')?.hidden).toBe(true);
  });
});
