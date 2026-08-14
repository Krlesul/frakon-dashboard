declare const __FRAKON_VERSION__: string;
declare const __FRAKON_SOURCE_COMMIT__: string;

export interface FrakonFrontendBuildIdentity {
  version: string;
  sourceCommit: string;
}

export const FRAKON_FRONTEND_BUILD: FrakonFrontendBuildIdentity = Object.freeze({
  version: typeof __FRAKON_VERSION__ === 'string' && __FRAKON_VERSION__ ? __FRAKON_VERSION__ : 'development',
  sourceCommit: typeof __FRAKON_SOURCE_COMMIT__ === 'string' && __FRAKON_SOURCE_COMMIT__ ? __FRAKON_SOURCE_COMMIT__ : 'development',
});

export function frakonBuildIdentityMatches(
  frontend: FrakonFrontendBuildIdentity,
  backend: { version: string; sourceCommit: string },
): boolean {
  if (frontend.version !== backend.version) return false;
  if (frontend.sourceCommit === 'development' || backend.sourceCommit === 'development') return true;
  return frontend.sourceCommit === backend.sourceCommit;
}
