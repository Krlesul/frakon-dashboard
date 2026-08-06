import type { SurfaceStyle } from './surface-style';

export type SurfacePresetId = 'borderless' | 'transparent' | 'solid' | 'glass' | 'gradient' | 'image';

export interface SurfacePreset {
  id: SurfacePresetId;
  label: string;
  style: SurfaceStyle;
}

export const SURFACE_PRESETS: readonly SurfacePreset[] = [
  {
    id: 'borderless',
    label: 'Borderless',
    style: { fill: 'theme', border: 'none', shadow: 'none', padding: 0 },
  },
  {
    id: 'transparent',
    label: 'Transparent',
    style: { fill: 'transparent', border: 'none', shadow: 'none', padding: 0 },
  },
  {
    id: 'solid',
    label: 'Solid',
    style: {
      fill: 'solid',
      backgroundColor: '#171a22',
      backgroundOpacity: 1,
      border: 'solid',
      borderColor: '#ffffff',
      borderOpacity: 0.1,
      borderWidth: 1,
      borderRadius: 20,
      shadow: '0 18px 46px rgb(0 0 0 / 22%)',
      padding: 0,
    },
  },
  {
    id: 'glass',
    label: 'Glass',
    style: {
      fill: 'glass',
      backgroundColor: '#171a22',
      backgroundOpacity: 0.55,
      backdropBlur: 24,
      border: 'solid',
      borderColor: '#ffffff',
      borderOpacity: 0.12,
      borderWidth: 1,
      borderRadius: 24,
      shadow: '0 24px 70px rgb(0 0 0 / 24%)',
      padding: 0,
    },
  },
  {
    id: 'gradient',
    label: 'Gradient',
    style: {
      fill: 'gradient',
      gradient: 'linear-gradient(145deg, #1f2633, #111319)',
      border: 'solid',
      borderColor: '#ffffff',
      borderOpacity: 0.1,
      borderWidth: 1,
      borderRadius: 24,
      shadow: '0 24px 70px rgb(0 0 0 / 24%)',
      padding: 0,
    },
  },
  {
    id: 'image',
    label: 'Image',
    style: {
      fill: 'image',
      backgroundImage: '',
      border: 'none',
      borderRadius: 24,
      shadow: '0 24px 70px rgb(0 0 0 / 24%)',
      padding: 0,
    },
  },
] as const;

export function surfacePreset(id: SurfacePresetId): SurfaceStyle {
  const preset = SURFACE_PRESETS.find((candidate) => candidate.id === id);
  return structuredClone(preset?.style ?? {});
}
