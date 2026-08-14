export type FrakonBinarySensorTone = 'inactive' | 'active' | 'danger' | 'unknown';

export interface FrakonBinarySensorPresentation {
  label: string;
  tone: FrakonBinarySensorTone;
  active: boolean | undefined;
}

const LABELS: Record<string, readonly [inactive: string, active: string]> = {
  battery: ['Battery OK', 'Low battery'],
  battery_charging: ['Not charging', 'Charging'],
  cold: ['Normal', 'Cold'],
  connectivity: ['Disconnected', 'Connected'],
  door: ['Closed', 'Open'],
  garage_door: ['Closed', 'Open'],
  gas: ['Clear', 'Gas detected'],
  heat: ['Normal', 'Hot'],
  light: ['Dark', 'Light detected'],
  lock: ['Locked', 'Unlocked'],
  moisture: ['Dry', 'Wet'],
  motion: ['Clear', 'Motion detected'],
  moving: ['Stopped', 'Moving'],
  occupancy: ['Clear', 'Occupied'],
  opening: ['Closed', 'Open'],
  plug: ['Unplugged', 'Plugged in'],
  power: ['No power', 'Power detected'],
  presence: ['Away', 'Present'],
  problem: ['OK', 'Problem'],
  running: ['Stopped', 'Running'],
  safety: ['Safe', 'Unsafe'],
  smoke: ['Clear', 'Smoke detected'],
  sound: ['Quiet', 'Sound detected'],
  tamper: ['Clear', 'Tamper detected'],
  update: ['Up to date', 'Update available'],
  vibration: ['Clear', 'Vibration detected'],
  window: ['Closed', 'Open'],
};

const DANGER_ACTIVE_CLASSES = new Set([
  'battery',
  'cold',
  'gas',
  'heat',
  'moisture',
  'problem',
  'safety',
  'smoke',
  'tamper',
]);

export function frakonBinarySensorPresentation(
  state: string,
  deviceClass?: string,
): FrakonBinarySensorPresentation {
  if (state !== 'on' && state !== 'off') {
    return { label: state === 'unavailable' ? 'Unavailable' : 'Unknown', tone: 'unknown', active: undefined };
  }

  const active = state === 'on';
  const labels = deviceClass ? LABELS[deviceClass] : undefined;
  const label = labels ? labels[active ? 1 : 0] : active ? 'On' : 'Off';
  const tone: FrakonBinarySensorTone = active
    ? (deviceClass && DANGER_ACTIVE_CLASSES.has(deviceClass) ? 'danger' : 'active')
    : 'inactive';
  return { label, tone, active };
}
