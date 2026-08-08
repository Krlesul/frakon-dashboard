import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import { isResponsiveCanvasV2Bundle, type ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';

export type ResponsiveCanvasV2WriteBlocker =
  | 'invalid-bundle'
  | 'contract-incompatible'
  | 'read-disabled'
  | 'write-disabled'
  | 'atomic-revision-disabled'
  | 'revision-sync-disabled'
  | 'unsupported-breakpoint'
  | 'unresolved-conflict';

export interface ResponsiveCanvasV2WriteReadiness {
  allowed: boolean;
  blockers: ResponsiveCanvasV2WriteBlocker[];
}

export interface ResponsiveCanvasV2WriteReadinessOptions {
  hasUnresolvedConflict?: boolean;
}

export function responsiveCanvasV2WriteReadiness(
  capabilities: DashboardServerCapabilities,
  bundle: ResponsiveCanvasV2Bundle,
  options: ResponsiveCanvasV2WriteReadinessOptions = {},
): ResponsiveCanvasV2WriteReadiness {
  const blockers: ResponsiveCanvasV2WriteBlocker[] = [];
  const responsive = capabilities.responsiveCanvasV2;

  if (!isResponsiveCanvasV2Bundle(bundle)) blockers.push('invalid-bundle');
  if (!responsive.contractCompatible) blockers.push('contract-incompatible');
  if (!responsive.read) blockers.push('read-disabled');
  if (!responsive.write) blockers.push('write-disabled');
  if (!responsive.atomicRevision) blockers.push('atomic-revision-disabled');
  if (!capabilities.revisionSync) blockers.push('revision-sync-disabled');
  if (Object.keys(bundle.documents).some((breakpoint) => !responsive.breakpoints.has(breakpoint))) {
    blockers.push('unsupported-breakpoint');
  }
  if (options.hasUnresolvedConflict) blockers.push('unresolved-conflict');

  return { allowed: blockers.length === 0, blockers };
}
