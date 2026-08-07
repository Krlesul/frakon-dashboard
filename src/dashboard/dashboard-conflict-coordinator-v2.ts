import { mergeDashboardDocuments, type DashboardMergeResult } from './dashboard-conflict-resolver';
import { resolveDashboardV2Conflicts } from './dashboard-selective-conflict-resolution-v2';
import type { DashboardConflictSelections } from './dashboard-selective-conflict-resolution';
import {
  createDashboardRevision,
  type DashboardRevisionComparison,
  type DashboardRevisionEnvelope,
} from './dashboard-revision';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardV2ConflictSession {
  comparison: DashboardRevisionComparison<FrakonDashboardDocumentV2>;
  base: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>;
  merge: DashboardMergeResult<FrakonDashboardDocumentV2>;
}

export type DashboardV2ConflictChoice = 'local' | 'remote' | 'merged';

export function createDashboardV2ConflictSession(
  comparison: DashboardRevisionComparison<FrakonDashboardDocumentV2>,
  base: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>,
): DashboardV2ConflictSession {
  return {
    comparison,
    base,
    merge: mergeDashboardDocuments(
      base.document,
      comparison.local.document,
      comparison.remote.document,
    ),
  };
}

export function resolveDashboardV2ConflictSession(
  session: DashboardV2ConflictSession,
  choice: DashboardV2ConflictChoice,
  clientId: string,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope<FrakonDashboardDocumentV2> {
  const document = choice === 'local'
    ? session.comparison.local.document
    : choice === 'remote'
      ? session.comparison.remote.document
      : resolveMergedDocument(session);

  return createResolvedRevision(session, document, clientId, updatedAt);
}

export function resolveDashboardV2ConflictSelections(
  session: DashboardV2ConflictSession,
  selections: DashboardConflictSelections,
  clientId: string,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope<FrakonDashboardDocumentV2> {
  const resolved = resolveDashboardV2Conflicts(session.merge, selections);
  if (!resolved.complete) {
    throw new Error(`Dashboard version 2 conflict selections are incomplete: ${resolved.unresolved.map((entry) => entry.path).join(', ')}`);
  }
  return createResolvedRevision(session, resolved.document, clientId, updatedAt);
}

function createResolvedRevision(
  session: DashboardV2ConflictSession,
  document: FrakonDashboardDocumentV2,
  clientId: string,
  updatedAt: number,
): DashboardRevisionEnvelope<FrakonDashboardDocumentV2> {
  return createDashboardRevision(
    document,
    clientId,
    session.comparison.remote,
    updatedAt,
  );
}

function resolveMergedDocument(session: DashboardV2ConflictSession): FrakonDashboardDocumentV2 {
  if (session.merge.conflicts.length > 0) {
    throw new Error('Cannot use automatic version 2 merge while dashboard conflicts remain unresolved.');
  }
  return session.merge.document;
}
