import type { FrakonBreakpoint } from './layout-model';
import { detectBreakpoint } from './responsive-layout';

export type ResponsiveCanvasV2BreakpointMode =
  | { kind: 'auto' }
  | { kind: 'manual'; breakpoint: FrakonBreakpoint };

export function resolveResponsiveCanvasV2Breakpoint(
  mode: ResponsiveCanvasV2BreakpointMode,
  width: number,
): FrakonBreakpoint {
  return mode.kind === 'manual' ? mode.breakpoint : detectBreakpoint(Math.max(1, width));
}
