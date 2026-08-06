export type SurfaceFillMode = 'theme' | 'solid' | 'transparent' | 'glass' | 'gradient' | 'image';
export type SurfaceBorderMode = 'theme' | 'none' | 'solid';

export interface SurfaceStyle {
  fill?: SurfaceFillMode;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundImage?: string;
  gradient?: string;
  backdropBlur?: number;
  border?: SurfaceBorderMode;
  borderColor?: string;
  borderOpacity?: number;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: string;
  padding?: number;
}

export const DEFAULT_SURFACE_STYLE: Required<Pick<SurfaceStyle,
  'fill' | 'backgroundOpacity' | 'backdropBlur' | 'border' | 'borderOpacity' | 'borderWidth' | 'borderRadius' | 'padding'
>> = {
  fill: 'theme',
  backgroundOpacity: 1,
  backdropBlur: 0,
  border: 'theme',
  borderOpacity: 1,
  borderWidth: 1,
  borderRadius: 20,
  padding: 0,
};

function clamp(value: number | undefined, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value as number)) : fallback;
}

export function normalizeSurfaceStyle(style: SurfaceStyle = {}): SurfaceStyle {
  return {
    ...style,
    fill: style.fill ?? DEFAULT_SURFACE_STYLE.fill,
    backgroundOpacity: clamp(style.backgroundOpacity, 0, 1, DEFAULT_SURFACE_STYLE.backgroundOpacity),
    backdropBlur: clamp(style.backdropBlur, 0, 80, DEFAULT_SURFACE_STYLE.backdropBlur),
    border: style.border ?? DEFAULT_SURFACE_STYLE.border,
    borderOpacity: clamp(style.borderOpacity, 0, 1, DEFAULT_SURFACE_STYLE.borderOpacity),
    borderWidth: clamp(style.borderWidth, 0, 16, DEFAULT_SURFACE_STYLE.borderWidth),
    borderRadius: clamp(style.borderRadius, 0, 128, DEFAULT_SURFACE_STYLE.borderRadius),
    padding: clamp(style.padding, 0, 128, DEFAULT_SURFACE_STYLE.padding),
  };
}

export function mergeSurfaceStyles(base?: SurfaceStyle, override?: SurfaceStyle): SurfaceStyle {
  return normalizeSurfaceStyle({ ...base, ...override });
}

function colorWithOpacity(color: string | undefined, opacity: number): string | undefined {
  if (!color) return undefined;
  if (opacity >= 1) return color;
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

export function surfaceStyleToCss(style: SurfaceStyle = {}): Record<string, string> {
  const normalized = normalizeSurfaceStyle(style);
  const css: Record<string, string> = {
    'border-radius': `${normalized.borderRadius}px`,
    padding: `${normalized.padding}px`,
  };

  if (normalized.fill === 'transparent') css.background = 'transparent';
  if (normalized.fill === 'theme') css.background = `color-mix(in srgb, var(--card-background-color) ${Math.round((normalized.backgroundOpacity ?? 1) * 100)}%, transparent)`;
  if (normalized.fill === 'solid') css.background = colorWithOpacity(normalized.backgroundColor ?? 'var(--card-background-color)', normalized.backgroundOpacity ?? 1) ?? 'transparent';
  if (normalized.fill === 'glass') {
    css.background = colorWithOpacity(normalized.backgroundColor ?? 'var(--card-background-color)', normalized.backgroundOpacity ?? 0.55) ?? 'transparent';
    css['backdrop-filter'] = `blur(${normalized.backdropBlur ?? 18}px)`;
  }
  if (normalized.fill === 'gradient') css.background = normalized.gradient ?? 'transparent';
  if (normalized.fill === 'image') {
    css['background-image'] = normalized.backgroundImage ? `url("${normalized.backgroundImage}")` : 'none';
    css['background-size'] = 'cover';
    css['background-position'] = 'center';
  }

  if (normalized.border === 'none') css.border = 'none';
  if (normalized.border === 'theme') css.border = `${normalized.borderWidth}px solid color-mix(in srgb, var(--primary-text-color) ${Math.round((normalized.borderOpacity ?? 1) * 10)}%, transparent)`;
  if (normalized.border === 'solid') css.border = `${normalized.borderWidth}px solid ${colorWithOpacity(normalized.borderColor ?? 'currentColor', normalized.borderOpacity ?? 1)}`;
  if (normalized.shadow) css['box-shadow'] = normalized.shadow;

  return css;
}

export function cssRecordToString(css: Record<string, string>): string {
  return Object.entries(css).map(([property, value]) => `${property}:${value}`).join(';');
}
