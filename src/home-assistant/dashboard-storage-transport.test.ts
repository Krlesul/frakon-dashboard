import { describe, expect, it, vi } from 'vitest';
import { HomeAssistantDashboardStorageTransport } from './dashboard-storage-transport';

 describe('HomeAssistantDashboardStorageTransport', () => {
  it('maps transport commands to hass.callWS messages', async () => {
    const callWS = vi.fn(async <T>(message: Record<string, unknown>): Promise<T> => {
      return { ok: true, message } as T;
    });
    const transport = new HomeAssistantDashboardStorageTransport({ callWS });

    await transport.request('frakon/dashboard/load', { id: 'home' });

    expect(callWS).toHaveBeenCalledWith({
      type: 'frakon/dashboard/load',
      id: 'home',
    });
  });

  it('fails clearly when callWS is unavailable', async () => {
    const transport = new HomeAssistantDashboardStorageTransport({});

    await expect(transport.request('frakon/dashboard/load', { id: 'home' }))
      .rejects.toThrow('Home Assistant WebSocket API is not available.');
  });
});
