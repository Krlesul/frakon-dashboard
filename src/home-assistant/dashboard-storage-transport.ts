import type { DashboardStorageTransport } from '../dashboard/dashboard-storage';
import type { HomeAssistant } from './types';

export class HomeAssistantDashboardStorageTransport implements DashboardStorageTransport {
  constructor(private readonly hass: Pick<HomeAssistant, 'callWS'>) {}

  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    if (!this.hass.callWS) {
      throw new Error('Home Assistant WebSocket API is not available.');
    }

    return this.hass.callWS<T>({
      type: command,
      ...payload,
    });
  }
}
