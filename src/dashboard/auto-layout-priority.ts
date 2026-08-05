import type { FrakonGridItem } from './layout-model';
import type { DashboardAutoLayoutMetadata } from './auto-layout-session';

export interface DashboardPriorityScore extends DashboardAutoLayoutMetadata {
  reasons: string[];
}

const TYPE_PRIORITIES: Record<string, number> = {
  'custom:frakon-camera-card': 85,
  'custom:frakon-climate-card': 65,
  'custom:frakon-vehicle-card': 60,
  'custom:frakon-room-card': 55,
  'custom:frakon-light-card': 50,
  'custom:frakon-cover-card': 45,
  'custom:frakon-media-player-card': 40,
  'custom:frakon-sensor-card': 30,
  'custom:frakon-card': 35,
};

function cardType(item: FrakonGridItem): string {
  return typeof item.card.type === 'string' ? item.card.type : '';
}

function configuredPriority(item: FrakonGridItem): number | undefined {
  const value = item.card.priority;
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : undefined;
}

export function scoreDashboardItemPriority(item: FrakonGridItem): DashboardPriorityScore {
  const type = cardType(item);
  const manual = configuredPriority(item);
  const reasons: string[] = [];
  let priority = TYPE_PRIORITIES[type] ?? 25;

  if (type) reasons.push(`card type ${type} gives base priority ${priority}`);
  else reasons.push(`unknown card type gives base priority ${priority}`);

  if (manual !== undefined) {
    priority = manual;
    reasons.push(`manual priority overrides the base score with ${manual}`);
  }

  if (item.locked) {
    reasons.push('locked cards keep their exact position and size');
  }

  const preferredWidth = type === 'custom:frakon-camera-card'
    ? Math.max(item.w, 6)
    : type === 'custom:frakon-room-card'
      ? Math.max(item.w, 4)
      : item.w;
  const preferredHeight = type === 'custom:frakon-camera-card'
    ? Math.max(item.h, 5)
    : item.h;

  return {
    priority,
    preferredWidth,
    preferredHeight,
    minWidth: item.minW,
    minHeight: item.minH,
    maxWidth: item.maxW,
    maxHeight: item.maxH,
    reasons,
  };
}
