import type { ResponsiveV2DraftSnapshot } from './responsive-v2-draft-controller';

export interface ResponsiveV2ParentStateHost extends HTMLElement {
  nativeV2Revision?: string;
  applyNativeV2Snapshot?: (snapshot: ResponsiveV2DraftSnapshot) => void;
  requestUpdate?: () => void;
}

export function applyResponsiveV2SavedStateToParent(
  host: ResponsiveV2ParentStateHost,
  revision: string,
  snapshot: ResponsiveV2DraftSnapshot,
): boolean {
  if (typeof host.applyNativeV2Snapshot !== 'function') return false;
  host.nativeV2Revision = revision;
  host.applyNativeV2Snapshot(snapshot);
  host.requestUpdate?.();
  return true;
}
