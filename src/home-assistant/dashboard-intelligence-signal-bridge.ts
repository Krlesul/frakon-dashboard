import {
  buildAutomaticDashboardIntelligenceContext,
  type HomeAssistantStateLike as IntelligenceHomeAssistantState,
} from '../dashboard/dashboard-intelligence-signals';
import type { DashboardDeviceContext, DashboardIntelligenceContext } from '../dashboard/dashboard-intelligence';
import type { DashboardInteractionTracker } from '../dashboard/dashboard-interaction-tracker';
import type { FrakonDashboardDocument, FrakonGridItem } from '../dashboard/layout-model';

export interface HomeAssistantStateLike {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
}

export interface HomeAssistantLike {
  states: Record<string, HomeAssistantStateLike>;
  language?: string;
  locale?: { language?: string };
}

export interface DashboardIntelligenceSignalBridgeOptions {
  device: DashboardDeviceContext;
  tracker?: Pick<DashboardInteractionTracker, 'snapshot'>;
  now?: number;
}

export function homeAssistantLanguage(hass: HomeAssistantLike | undefined): string {
  return hass?.locale?.language || hass?.language || 'en';
}

export function buildDashboardIntelligenceContextFromHass(
  document: FrakonDashboardDocument,
  hass: HomeAssistantLike | undefined,
  options: DashboardIntelligenceSignalBridgeOptions,
): DashboardIntelligenceContext {
  const states: Record<string, IntelligenceHomeAssistantState | undefined> = {};

  for (const [entityId, source] of Object.entries(hass?.states ?? {})) {
    states[entityId] = {
      entity_id: source.entity_id || entityId,
      state: source.state,
      attributes: source.attributes ?? {},
      last_changed: source.last_changed,
    };
  }

  return buildAutomaticDashboardIntelligenceContext(document, {
    device: options.device,
    now: options.now,
    interactions: options.tracker?.snapshot(options.now),
    states,
  });
}

export function extractDashboardItemEntityIds(item: FrakonGridItem): string[] {
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

  for (const entry of Object.values(value)) collectEntityIds(entry, ids, visited);
}
