import {
  LocalStorageDashboardAdapter,
  RemoteDashboardStorageAdapter,
  type DashboardStorageAdapter,
} from '../dashboard/dashboard-storage';
import { HomeAssistantDashboardStorageTransport } from './dashboard-storage-transport';
import type { HomeAssistant } from './types';

export type DashboardStorageMode = 'local' | 'home-assistant';

export function createHomeAssistantDashboardStorage(
  mode: DashboardStorageMode,
  hass?: Pick<HomeAssistant, 'callWS'>,
): DashboardStorageAdapter {
  if (mode === 'home-assistant' && hass?.callWS) {
    return new RemoteDashboardStorageAdapter(
      new HomeAssistantDashboardStorageTransport(hass),
    );
  }

  return new LocalStorageDashboardAdapter();
}
