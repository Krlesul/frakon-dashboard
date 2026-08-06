import { buildAutomaticDashboardIntelligenceContext, type HomeAssistantEntityState } from '../dashboard/dashboard-intelligence-signals';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../dashboard/dashboard-intelligence';
import type { DashboardInteractionTracker } from '../dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument, FrakonGridItem } from '../dashboard/layout-model';

export interface HomeAssistantStateLike {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
}

export interface HomeAssistantLike {
  states: Record<string, HomeAssistantStateLike>;
}

export interface DashboardIntelligenceSignalBridgeOptions {
  device: DashboardDeviceContext;
  tracker?: Pick<DashboardInteractionTracker, 'signals'>;
  now?: number;
}

export function buildDashboardIntelligenceContextFromHass(
  document: FrakonDashboardDocument,
  hass: HomeAssistantLike | undefined,
  options: DashboardIntelligenceSignalBridgeOptions,
): DashboardIntelligenceContext {
  const states = hass?.states ?? {};
  const entityStates = new Map<string, HomeAssistantEntityState>();

  for (const state of Object.values(states)) {
    entityStates.set(state.entity_id, {
      entityId: state.entity_id,
      state: state.state,
      attributes: state.attributes ?? {},
    });
  }

  const itemStates = document.items.flatMap((item) => {
    const entityIds = extractEntityIds(item);
    const matched = entityIds.map((entityId) => entityStates.get(entityId)).filter(isDefined);
    if (matched.length === 0) return [];
    return [{
      itemId: item.id,
      states: matched,
    }];
  });

  return buildAutomaticDashboardIntelligenceContext(document, {
    device: options.device,
    now: options.now,
    interactions: options.tracker?.signals(options.now),
    itemStates,
  });
}

export function extractDashboardItemEntityIds(item: FrakonGridItem): string[] {
  return extractEntityIds(item);
}

function extractEntityIds(item: FrakonGridItem): string[] {
  const ids = new Set<string>();
  collectEntityIds(item.card, ids, new Set<object>());
  return [...ids].sort();
}

function collectEntityIds(value: unknown, ids: Set<string>, visited: Set<object>): void {
  if (typeof value === 'string') {
    if (/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(value)) ids.add(value);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) collectEntityIds(entry, ids, visited);
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if ((key === 'entity' || key === 'entity_id') && typeof entry === 'string') {
      ids.add(entry);
      continue;
    }
    collectEntityIds(entry, ids, visited);
  }
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
