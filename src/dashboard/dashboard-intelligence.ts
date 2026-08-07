import { scoreDashboardItemPriority } from './auto-layout-priority';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export type DashboardDeviceContext = 'mobile' | 'tablet' | 'wall' | 'desktop';
export type DashboardDaypart = 'morning' | 'day' | 'evening' | 'night';
export type DashboardUrgencySeverity = 'normal' | 'warning' | 'critical';

export interface DashboardEntityMetadata {
  areaName?: string;
  deviceName?: string;
}

export interface DashboardUsageSignal {
  itemId: string;
  interactions30d?: number;
  lastUsedAt?: number;
  urgent?: boolean;
  severity?: DashboardUrgencySeverity;
  urgencyReasons?: string[];
  sourceEntityIds?: string[];
  sourceEntityLabels?: Record<string, string>;
  sourceEntityMetadata?: Record<string, DashboardEntityMetadata>;
}

export interface DashboardIntelligenceContext {
  device: DashboardDeviceContext;
  daypart?: DashboardDaypart;
  now?: number;
  usage?: DashboardUsageSignal[];
}

export interface DashboardIntelligenceScore {
  itemId: string;
  score: number;
  tier: 'critical' | 'primary' | 'secondary' | 'background';
  reasons: string[];
  recommendedWidth: number;
  recommendedHeight: number;
}

export interface DashboardIntelligenceAnalysis {
  scores: DashboardIntelligenceScore[];
  orderedItemIds: string[];
}

export function analyzeDashboardIntelligence(document: FrakonDashboardDocument, context: DashboardIntelligenceContext): DashboardIntelligenceAnalysis {
  const usage = new Map((context.usage ?? []).map((signal) => [signal.itemId, signal]));
  const scores = document.items.map((item) => scoreItem(item, context, usage.get(item.id)));
  scores.sort((left, right) => right.score - left.score || left.itemId.localeCompare(right.itemId));
  return { scores, orderedItemIds: scores.map((score) => score.itemId) };
}

function scoreItem(item: FrakonGridItem, context: DashboardIntelligenceContext, usage?: DashboardUsageSignal): DashboardIntelligenceScore {
  const base = scoreDashboardItemPriority(item);
  const reasons = [...base.reasons];
  let score: number = base.priority ?? 0;
  const interactions = Math.max(0, usage?.interactions30d ?? 0);
  const usageBoost = Math.min(20, Math.round(Math.log2(interactions + 1) * 4));
  if (usageBoost > 0) { score += usageBoost; reasons.push(`recent usage adds ${usageBoost} points`); }
  if (usage?.urgent) { const severity = usage.severity ?? 'warning'; const boost = severity === 'critical' ? 90 : severity === 'warning' ? 60 : 30; score += boost; reasons.push(`${severity} urgency adds ${boost} points`); }
  const type = typeof item.card.type === 'string' ? item.card.type : '';
  const deviceBoost = deviceAdjustment(type, context.device);
  if (deviceBoost !== 0) { score += deviceBoost; reasons.push(`${context.device} context ${deviceBoost > 0 ? 'adds' : 'removes'} ${Math.abs(deviceBoost)} points`); }
  const daypartBoost = daypartAdjustment(type, context.daypart);
  if (daypartBoost !== 0) { score += daypartBoost; reasons.push(`${context.daypart} context adds ${daypartBoost} points`); }
  score = Math.max(0, Math.min(150, Math.round(score)));
  return { itemId:item.id, score, tier:score>=100?'critical':score>=70?'primary':score>=40?'secondary':'background', reasons, recommendedWidth:recommendedWidth(item,type,context.device,base.preferredWidth), recommendedHeight:recommendedHeight(item,type,context.device,base.preferredHeight) };
}

function deviceAdjustment(type: string, device: DashboardDeviceContext): number {
  if (device === 'wall' && (type.includes('camera') || type.includes('sensor'))) return 12;
  if (device === 'mobile' && type.includes('camera')) return -8;
  if (device === 'mobile' && (type.includes('light') || type.includes('cover'))) return 8;
  if (device === 'tablet' && type.includes('room')) return 8;
  return 0;
}

function daypartAdjustment(type: string, daypart?: DashboardDaypart): number {
  if (daypart === 'night' && (type.includes('camera') || type.includes('cover'))) return 10;
  if (daypart === 'morning' && (type.includes('climate') || type.includes('vehicle'))) return 8;
  if (daypart === 'evening' && (type.includes('light') || type.includes('media'))) return 8;
  return 0;
}

function recommendedWidth(item: FrakonGridItem, type: string, device: DashboardDeviceContext, preferred?: number): number {
  if (device === 'mobile') return Math.min(item.w, 4);
  if (device === 'wall' && type.includes('camera')) return Math.max(preferred ?? item.w, 6);
  return preferred ?? item.w;
}

function recommendedHeight(item: FrakonGridItem, type: string, device: DashboardDeviceContext, preferred?: number): number {
  if (device === 'mobile') return Math.min(item.h, 4);
  if (device === 'wall' && type.includes('camera')) return Math.max(preferred ?? item.h, 5);
  return preferred ?? item.h;
}
