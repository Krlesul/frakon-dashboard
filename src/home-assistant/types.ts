export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  language?: string;
  locale?: { language?: string };
  states: Record<string, HassEntityState>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  hassUrl?(path: string): string;
}

export interface LovelaceCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  language?: string;
  tap_action?: 'toggle' | 'more-info' | 'none';
}
