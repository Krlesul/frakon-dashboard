import type {
  DashboardDaypart,
  DashboardIntelligenceContext,
  DashboardUsageSignal,
} from './dashboard-intelligence';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface HomeAssistantStateLike {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
}

export interface DashboardInteractionRecord {
  itemId: string;
  timestamp: number;
}

export interface DashboardIntelligenceSignalOptions {
  now?: number;
  device: DashboardIntelligenceContext['device'];
  interactions?: DashboardInteractionRecord[];
  states?: Record<string, HomeAssistantStateLike | undefined>;
}

export interface DashboardUrgencyResult {
  urgent: boolean;
  reasons: string[];
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function deriveDashboardDaypart(timestamp = Date.now()): DashboardDaypart {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 18) return 'day';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

export function countDashboardInteractions(
  records: DashboardInteractionRecord[],
  now = Date.now(),
): DashboardUsageSignal[] {
  const cutoff = now - THIRTY_DAYS;
  const buckets = new Map<string, { count: number; lastUsedAt: number }>();

  for (const record of records) {
    if (!record.itemId || !Number.isFinite(record.timestamp) || record.timestamp < cutoff || record.timestamp > now) continue;
    const current = buckets.get(record.itemId) ?? { count: 0, lastUsedAt: 0 };
    current.count += 1;
    current.lastUsedAt = Math.max(current.lastUsedAt, record.timestamp);
    buckets.set(record.itemId, current);
  }

  return [...buckets.entries()]
    .map(([itemId, value]) => ({
      itemId,
      interactions30d: value.count,
      lastUsedAt: value.lastUsedAt,
    }))
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
}

export function deriveDashboardItemUrgency(
  item: FrakonGridItem,
  states: Record<string, HomeAssistantStateLike | undefined>,
): DashboardUrgencyResult {
  const entityIds = itemEntityIds(item);
  const reasons: string[] = [];

  for (const entityId of entityIds) {
    const entity = states[entityId];
    if (!entity) continue;
    const state = entity.state.toLowerCase();
    const domain = entityId.split('.')[0] ?? '';

    if (state === 'unavailable' || state === 'unknown') reasons.push(`${entityId} is ${state}`);
    if (domain === 'binary_sensor' && state === 'on' && urgentBinaryDeviceClass(entity.attributes?.device_class)) {
      reasons.push(`${entityId} reports an active ${String(entity.attributes?.device_class)} condition`);
    }
    if ((domain === 'lock' && state === 'unlocked') || (domain === 'cover' && ['open', 'opening'].includes(state))) {
      reasons.push(`${entityId} is ${state}`);
    }
    if (domain === 'alarm_control_panel' && !['disarmed', 'armed_home', 'armed_away', 'armed_night'].includes(state)) {
      reasons.push(`${entityId} is in alarm state ${state}`);
    }
    if (domain === 'sensor' && lowBattery(entity)) reasons.push(`${entityId} has a low battery`);
    if (domain === 'climate' && climateProblem(entity)) reasons.push(`${entityId} reports a climate problem`);
  }

  return { urgent: reasons.length > 0, reasons };
}

export function buildAutomaticDashboardIntelligenceContext(
  document: FrakonDashboardDocument,
  options: DashboardIntelligenceSignalOptions,
): DashboardIntelligenceContext {
  const now = options.now ?? Date.now();
  const usageById = new Map(countDashboardInteractions(options.interactions ?? [], now).map((signal) => [signal.itemId, signal]));
  const states = options.states ?? {};

  const usage = document.items.map((item) => {
    const existing = usageById.get(item.id);
    const urgency = deriveDashboardItemUrgency(item, states);
    return {
      itemId: item.id,
      interactions30d: existing?.interactions30d ?? 0,
      lastUsedAt: existing?.lastUsedAt,
      urgent: urgency.urgent,
    } satisfies DashboardUsageSignal;
  });

  return {
    device: options.device,
    daypart: deriveDashboardDaypart(now),
    now,
    usage,
  };
}

function itemEntityIds(item: FrakonGridItem): string[] {
  const values: unknown[] = [
    item.card.entity,
    item.card.entity_id,
    item.card.camera_entity,
    item.card.battery_entity,
    item.card.range_entity,
    item.card.charging_entity,
  ];
  if (Array.isArray(item.card.entities)) values.push(...item.card.entities);

  const ids = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.includes('.')) ids.add(value);
    else if (value && typeof value === 'object' && 'entity' in value) {
      const entity = (value as { entity?: unknown }).entity;
      if (typeof entity === 'string' && entity.includes('.')) ids.add(entity);
    }
  }
  return [...ids];
}

function urgentBinaryDeviceClass(value: unknown): boolean {
  return ['moisture', 'smoke', 'gas', 'safety', 'problem', 'tamper', 'door', 'garage_door', 'window'].includes(String(value ?? ''));
}

function lowBattery(entity: HomeAssistantStateLike): boolean {
  const numeric = Number(entity.state);
  const deviceClass = String(entity.attributes?.device_class ?? '');
  const unit = String(entity.attributes?.unit_of_measurement ?? '');
  return Number.isFinite(numeric) && numeric <= 15 && (deviceClass === 'battery' || unit === '%');
}

function climateProblem(entity: HomeAssistantStateLike): boolean {
  const current = Number(entity.attributes?.current_temperature);
  const target = Number(entity.attributes?.temperature);
  return Number.isFinite(current) && Number.isFinite(target) && Math.abs(current - target) >= 5;
}
