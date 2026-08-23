export function frakonSwitchActionForState(state: string): 'turn_on' | 'turn_off' | undefined {
  if (state === 'on') return 'turn_off';
  if (state === 'off') return 'turn_on';
  return undefined;
}
