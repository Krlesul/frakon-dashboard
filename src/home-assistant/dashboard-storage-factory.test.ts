import { describe, expect, it, vi } from 'vitest';
import { createHomeAssistantDashboardStorage } from './dashboard-storage-factory';

describe('createHomeAssistantDashboardStorage', () => {
  it('uses local storage by default', () => {
    expect(createHomeAssistantDashboardStorage('local').kind).toBe('local-storage');
  });

  it('falls back to local storage when callWS is unavailable', () => {
    expect(createHomeAssistantDashboardStorage('home-assistant', {}).kind).toBe('local-storage');
  });

  it('creates remote storage when Home Assistant WebSocket is available', () => {
    const callWS = vi.fn(async <T>(): Promise<T> => undefined as T);
    expect(createHomeAssistantDashboardStorage('home-assistant', { callWS }).kind).toBe('remote');
  });
});
