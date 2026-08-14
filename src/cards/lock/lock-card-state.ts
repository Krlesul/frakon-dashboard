export function frakonLockActionForState(state: string): 'lock' | 'unlock' | undefined {
  if (state === 'locked') return 'unlock';
  if (state === 'unlocked') return 'lock';
  return undefined;
}
