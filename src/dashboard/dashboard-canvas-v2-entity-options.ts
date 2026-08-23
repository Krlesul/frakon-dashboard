import type { HomeAssistant } from '../home-assistant/types';

export interface DashboardCanvasV2EntityOption {
  entityId: string;
  label: string;
}

export function filterDashboardCanvasV2EntityOptions(
  options: readonly DashboardCanvasV2EntityOption[],
  query: string,
): DashboardCanvasV2EntityOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...options];
  return options.filter((option) => `${option.label} ${option.entityId}`.toLocaleLowerCase().includes(normalized));
}

export function dashboardCanvasV2EntityOptions(
  hass: HomeAssistant | undefined,
  domains?: readonly string[],
  current?: string | readonly string[],
  deviceClasses?: readonly string[],
): DashboardCanvasV2EntityOption[] {
  const allowedDomains = domains?.length ? new Set(domains) : undefined;
  const allowedDeviceClasses = deviceClasses?.length ? new Set(deviceClasses) : undefined;
  const states = hass?.states ?? {};
  const ids = Object.keys(states).filter((entityId) => {
    const [domain, objectId] = entityId.split('.', 2);
    if (!domain || !objectId) return false;
    if (allowedDomains && !allowedDomains.has(domain)) return false;
    if (!allowedDeviceClasses) return true;
    const deviceClass = states[entityId]?.attributes?.device_class;
    return typeof deviceClass === 'string' && allowedDeviceClasses.has(deviceClass);
  });
  const configured = Array.isArray(current) ? current : current ? [current] : [];
  for (const entityId of configured) {
    if (entityId.includes('.') && !ids.includes(entityId)) ids.push(entityId);
  }
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b)).map((entityId) => {
    const friendly = states[entityId]?.attributes?.friendly_name;
    return {
      entityId,
      label: typeof friendly === 'string' && friendly.trim() ? `${friendly.trim()} · ${entityId}` : entityId,
    };
  });
}
