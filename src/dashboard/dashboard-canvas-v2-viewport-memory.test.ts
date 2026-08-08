import { describe, expect, it } from 'vitest';
import {
  clearDashboardCanvasV2Viewport,
  dashboardCanvasV2ViewportMemoryKey,
  loadDashboardCanvasV2Viewport,
  saveDashboardCanvasV2Viewport,
  type DashboardCanvasV2ViewportStorage,
} from './dashboard-canvas-v2-viewport-memory';

class MemoryStorage implements DashboardCanvasV2ViewportStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe('dashboard canvas v2 viewport memory', () => {
  it('scopes viewport state by dashboard and breakpoint', () => {
    const storage = new MemoryStorage();
    saveDashboardCanvasV2Viewport(storage, 'home', 'desktop', { x: 12, y: -8, zoom: 1.4 });
    expect(loadDashboardCanvasV2Viewport(storage, 'home', 'desktop')).toEqual({ x: 12, y: -8, zoom: 1.4 });
    expect(loadDashboardCanvasV2Viewport(storage, 'home', 'tablet')).toBeUndefined();
    expect(dashboardCanvasV2ViewportMemoryKey('home', 'desktop')).not.toBe(dashboardCanvasV2ViewportMemoryKey('home', 'tablet'));
  });

  it('ignores malformed persisted data', () => {
    const storage = new MemoryStorage();
    storage.setItem(dashboardCanvasV2ViewportMemoryKey('home', 'desktop'), '{bad');
    expect(loadDashboardCanvasV2Viewport(storage, 'home', 'desktop')).toBeUndefined();
  });

  it('clears a saved viewport independently of the document', () => {
    const storage = new MemoryStorage();
    saveDashboardCanvasV2Viewport(storage, 'home', 'desktop', { x: 1, y: 2, zoom: 1 });
    clearDashboardCanvasV2Viewport(storage, 'home', 'desktop');
    expect(loadDashboardCanvasV2Viewport(storage, 'home', 'desktop')).toBeUndefined();
  });
});
