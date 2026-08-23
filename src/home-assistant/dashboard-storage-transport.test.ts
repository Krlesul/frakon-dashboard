import { describe, expect, it } from 'vitest';
import { HomeAssistantDashboardStorageTransport } from './dashboard-storage-transport';
import type { HomeAssistant } from './types';

describe('HomeAssistantDashboardStorageTransport', () => {
  it('maps transport commands to hass.callWS messages', async () => {
    const messages: Record<string, unknown>[] = [];
    const callWS: NonNullable<HomeAssistant['callWS']> = async <T>(message: Record<string, unknown>): Promise<T> => {
      messages.push(message);
      return { ok: true, message } as T;
    };
    const transport = new HomeAssistantDashboardStorageTransport({ callWS });

    await transport.request('frakon/dashboard/load', { id: 'home' });

    expect(messages).toEqual([{
      type: 'frakon/dashboard/load',
      id: 'home',
    }]);
  });

  it('fails clearly when callWS is unavailable', async () => {
    const transport = new HomeAssistantDashboardStorageTransport({});

    await expect(transport.request('frakon/dashboard/load', { id: 'home' }))
      .rejects.toThrow('Home Assistant WebSocket API is not available.');
  });
});
