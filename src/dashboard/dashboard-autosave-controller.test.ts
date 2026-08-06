import { describe, expect, it, vi } from 'vitest';
import { DashboardAutosaveController } from './dashboard-autosave-controller';
import { DashboardStorageController } from './dashboard-storage-controller';
import type { DashboardStorageAdapter } from './dashboard-storage';
import type { FrakonDashboardDocument } from './layout-model';

function dashboard(id: string, revision = 0): FrakonDashboardDocument {
  return {
    version: 1,
    id,
    name: `${id}-${revision}`,
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items: [
      {
        id: 'card',
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        card: { type: 'custom:frakon-card' },
      },
    ],
  };
}

class RecordingAdapter implements DashboardStorageAdapter {
  readonly kind = 'memory';
  readonly saved: FrakonDashboardDocument[] = [];
  saveGate?: Promise<void>;

  async load(): Promise<FrakonDashboardDocument | undefined> {
    return undefined;
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    if (this.saveGate) await this.saveGate;
    this.saved.push(structuredClone(document));
  }

  async remove(): Promise<void> {}
}

describe('DashboardAutosaveController', () => {
  it('debounces committed documents and saves only the newest pending version', async () => {
    vi.useFakeTimers();
    const adapter = new RecordingAdapter();
    const autosave = new DashboardAutosaveController(new DashboardStorageController(adapter), 100);

    autosave.schedule(dashboard('home', 1));
    autosave.schedule(dashboard('home', 2));
    await vi.advanceTimersByTimeAsync(100);
    await autosave.flush();

    expect(adapter.saved).toHaveLength(1);
    expect(adapter.saved[0]?.name).toBe('home-2');
    expect(autosave.currentState.pending).toBe(false);
    expect(autosave.currentState.lastSavedAt).toBeTypeOf('number');
    autosave.dispose();
    vi.useRealTimers();
  });

  it('flushes immediately without waiting for the debounce timer', async () => {
    vi.useFakeTimers();
    const adapter = new RecordingAdapter();
    const autosave = new DashboardAutosaveController(new DashboardStorageController(adapter), 10_000);

    autosave.schedule(dashboard('home', 3));
    await autosave.flush();

    expect(adapter.saved).toHaveLength(1);
    expect(adapter.saved[0]?.name).toBe('home-3');
    autosave.dispose();
    vi.useRealTimers();
  });

  it('saves a newer document queued while an earlier save is running', async () => {
    const adapter = new RecordingAdapter();
    let release: (() => void) | undefined;
    adapter.saveGate = new Promise<void>((resolve) => { release = resolve; });
    const autosave = new DashboardAutosaveController(new DashboardStorageController(adapter), 0);

    autosave.schedule(dashboard('home', 1));
    const firstFlush = autosave.flush();
    await Promise.resolve();
    autosave.schedule(dashboard('home', 4));
    release?.();
    await firstFlush;
    await autosave.flush();

    expect(adapter.saved.map((entry) => entry.name)).toEqual(['home-1', 'home-4']);
    autosave.dispose();
  });

  it('cancel removes an unsaved pending document', async () => {
    vi.useFakeTimers();
    const adapter = new RecordingAdapter();
    const autosave = new DashboardAutosaveController(new DashboardStorageController(adapter), 100);

    autosave.schedule(dashboard('home', 5));
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(100);

    expect(adapter.saved).toHaveLength(0);
    expect(autosave.currentState.pending).toBe(false);
    autosave.dispose();
    vi.useRealTimers();
  });
});
