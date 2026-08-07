import { describe, expect, it } from 'vitest';
import {
  canPersistDashboardDocument,
  DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES,
  resolveDashboardLayoutOpenPlan,
} from './dashboard-layout-version-policy';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

const v1: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [],
};

const v2 = migrateDashboardV1ToV2(v1, 430);

describe('dashboard layout version policy', () => {
  it('keeps version 1 grid editing enabled by default', () => {
    expect(resolveDashboardLayoutOpenPlan(v1, 'grid', DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES)).toEqual({
      kind: 'open-v1',
      editable: true,
      mode: 'grid',
    });
  });

  it('allows only a non-destructive migration preview from v1 to canvas by default', () => {
    expect(resolveDashboardLayoutOpenPlan(v1, 'canvas', DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES)).toEqual({
      kind: 'migration-preview',
      editable: false,
      from: 1,
      to: 2,
      mode: 'canvas',
    });
  });

  it('blocks reading version 2 until the client explicitly enables it', () => {
    expect(resolveDashboardLayoutOpenPlan(v2, 'canvas', DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES)).toMatchObject({
      kind: 'blocked',
      reason: 'v2-read-disabled',
    });
  });

  it('can open v2 read-only before v2 persistence is enabled', () => {
    expect(resolveDashboardLayoutOpenPlan(v2, 'canvas', {
      readV2: true,
      writeV2: false,
      migrateV1ToV2: true,
    })).toEqual({ kind: 'open-v2', editable: false, mode: 'canvas' });
    expect(canPersistDashboardDocument(v2, {
      readV2: true,
      writeV2: false,
      migrateV1ToV2: true,
    })).toBe(false);
  });

  it('allows v2 persistence only behind the explicit write capability', () => {
    expect(canPersistDashboardDocument(v2, {
      readV2: true,
      writeV2: true,
      migrateV1ToV2: true,
    })).toBe(true);
    expect(canPersistDashboardDocument(v1, DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES)).toBe(true);
  });
});
