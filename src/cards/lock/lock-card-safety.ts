export type FrakonLockUnlockIntent = 'confirm' | 'execute';

export function frakonLockUnlockIntent(
  confirmUnlock: boolean | undefined,
  confirmationArmed: boolean,
): FrakonLockUnlockIntent {
  if (confirmUnlock === false) return 'execute';
  return confirmationArmed ? 'execute' : 'confirm';
}
