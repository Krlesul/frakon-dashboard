import type { FrakonBreakpoint } from './layout-model';
import { createResponsiveCanvasV2Bundle, type ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import type { ResponsiveCanvasV2MergeConflict } from './responsive-v2-merge';

export type ResponsiveCanvasV2ConflictChoice = 'local' | 'remote';
export type ResponsiveCanvasV2ConflictSelections = Partial<Record<FrakonBreakpoint, ResponsiveCanvasV2ConflictChoice>>;

export interface ResolveResponsiveCanvasV2ConflictsInput {
  merged: ResponsiveCanvasV2Bundle;
  local: ResponsiveCanvasV2Bundle;
  remote: ResponsiveCanvasV2Bundle;
  conflicts: ResponsiveCanvasV2MergeConflict[];
  selections: ResponsiveCanvasV2ConflictSelections;
}

export interface ResolveResponsiveCanvasV2ConflictsResult {
  status: 'resolved' | 'incomplete';
  bundle: ResponsiveCanvasV2Bundle;
  unresolved: FrakonBreakpoint[];
}

export function resolveResponsiveCanvasV2Conflicts(
  input: ResolveResponsiveCanvasV2ConflictsInput,
): ResolveResponsiveCanvasV2ConflictsResult {
  const documents = structuredClone(input.merged.documents);
  const unresolved: FrakonBreakpoint[] = [];

  for (const conflict of input.conflicts) {
    const choice = input.selections[conflict.breakpoint];
    if (!choice) {
      unresolved.push(conflict.breakpoint);
      continue;
    }
    const source = choice === 'local' ? input.local : input.remote;
    const document = source.documents[conflict.breakpoint];
    if (document) documents[conflict.breakpoint] = structuredClone(document);
    else delete documents[conflict.breakpoint];
  }

  const fallback = documents[input.remote.defaultBreakpoint]
    ? input.remote.defaultBreakpoint
    : documents[input.local.defaultBreakpoint]
      ? input.local.defaultBreakpoint
      : (Object.keys(documents)[0] as FrakonBreakpoint | undefined) ?? 'desktop';

  return {
    status: unresolved.length ? 'incomplete' : 'resolved',
    bundle: createResponsiveCanvasV2Bundle(documents, fallback),
    unresolved,
  };
}
