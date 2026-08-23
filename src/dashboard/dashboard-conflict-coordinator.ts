import { mergeDashboardDocuments, type DashboardMergeResult } from './dashboard-conflict-resolver';
import {
  resolveDashboardConflicts,
  type DashboardConflictSelections,
} from './dashboard-selective-conflict-resolution';
import {
  createDashboardRevision,
  type DashboardRevisionComparison,
  type DashboardRevisionEnvelope,
} from './dashboard-revision';

export interface DashboardConflictSession {
  comparison: DashboardRevisionComparison;
  base: DashboardRevisionEnvelope;
  merge: DashboardMergeResult;
}

export type DashboardConflictChoice = 'local' | 'remote' | 'merged';

export function createDashboardConflictSession(
  comparison: DashboardRevisionComparison,
  base: DashboardRevisionEnvelope,
): DashboardConflictSession {
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

export function resolveDashboardConflictSession(
  session: DashboardConflictSession,
  choice: DashboardConflictChoice,
  clientId: string,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope {
  const document = choice === 'local'
    ? session.comparison.local.document
    : choice === 'remote'
      ? session.comparison.remote.document
      : resolveMergedDocument(session);

  return createResolvedRevision(session, document, clientId, updatedAt);
}

export function resolveDashboardConflictSelections(
  session: DashboardConflictSession,
  selections: DashboardConflictSelections,
  clientId: string,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope {
  const resolved = resolveDashboardConflicts(session.merge, selections);
  if (!resolved.complete) {
    throw new Error(`Dashboard conflict selections are incomplete: ${resolved.unresolved.map((entry) => entry.path).join(', ')}`);
  }
  return createResolvedRevision(session, resolved.document, clientId, updatedAt);
}

function createResolvedRevision(
  session: DashboardConflictSession,
  document: DashboardRevisionEnvelope['document'],
  clientId: string,
  updatedAt: number,
): DashboardRevisionEnvelope {
  return createDashboardRevision(
    document,
    clientId,
    session.comparison.remote,
    updatedAt,
  );
}

function resolveMergedDocument(session: DashboardConflictSession) {
  if (session.merge.conflicts.length > 0) {
    throw new Error('Cannot use automatic merge while dashboard conflicts remain unresolved.');
  }
  return session.merge.document;
}
