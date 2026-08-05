import { describe, expect, it } from 'vitest';
import { createHomeAssistantDashboardStorage } from './dashboard-storage-factory';
import type { HomeAssistant } from './types';

describe('createHomeAssistantDashboardStorage', () => {
  it('uses local storage by default', () => {
    expect(createHomeAssistantDashboardStorage('local').kind).toBe('local-storage');
  });

  it('falls back to local storage when callWS is unavailable', () => {
    expect(createHomeAssistantDashboardStorage('home-assistant', {}).kind).toBe('local-storage');
  });

  it('creates remote storage when Home Assistant WebSocket is available', () => {
    const callWS: NonNullable<HomeAssistant['callWS']> = async <T>(): Promise<T> => undefined as T;
    expect(createHomeAssistantDashboardStorage('home-assistant', { callWS }).kind).toBe('remote');
  });
});
