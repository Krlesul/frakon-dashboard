export interface FrakonActionService {
  domain: 'button' | 'input_button' | 'script' | 'scene';
  service: 'press' | 'turn_on';
}

export function frakonActionService(entityId: string): FrakonActionService | undefined {
  const domain = entityId.split('.', 1)[0];
  if (domain === 'button') return { domain: 'button', service: 'press' };
  if (domain === 'input_button') return { domain: 'input_button', service: 'press' };
  if (domain === 'script') return { domain: 'script', service: 'turn_on' };
  if (domain === 'scene') return { domain: 'scene', service: 'turn_on' };
  return undefined;
}
