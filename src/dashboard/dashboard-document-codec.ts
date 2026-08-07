import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';
import {
  isDashboardDocumentV2,
  normalizeDashboardV2,
  type FrakonDashboardDocumentV2,
} from './layout-model-v2';

export type FrakonDashboardAnyDocument = FrakonDashboardDocument | FrakonDashboardDocumentV2;

export type DashboardDocumentDecodeResult =
  | { ok: true; document: FrakonDashboardAnyDocument }
  | { ok: false; reason: 'invalid-json' | 'unsupported-version' | 'invalid-document' };

function isV1Candidate(value: unknown): value is FrakonDashboardDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrakonDashboardDocument>;
  return candidate.version === 1
    && typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.title === 'string'
    && Array.isArray(candidate.items);
}

export function normalizeAnyDashboardDocument(document: FrakonDashboardAnyDocument): FrakonDashboardAnyDocument {
  return document.version === 2
    ? normalizeDashboardV2(document)
    : normalizeDashboard(document);
}

export function decodeDashboardDocument(source: string): DashboardDocumentDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }

  if (isDashboardDocumentV2(parsed)) {
    try {
      return { ok: true, document: normalizeDashboardV2(parsed) };
    } catch {
      return { ok: false, reason: 'invalid-document' };
    }
  }

  if (isV1Candidate(parsed)) {
    try {
      return { ok: true, document: normalizeDashboard(parsed) };
    } catch {
      return { ok: false, reason: 'invalid-document' };
    }
  }

  const version = parsed && typeof parsed === 'object'
    ? (parsed as { version?: unknown }).version
    : undefined;
  return {
    ok: false,
    reason: version === 1 || version === 2 ? 'invalid-document' : 'unsupported-version',
  };
}

export function encodeDashboardDocument(document: FrakonDashboardAnyDocument): string {
  return JSON.stringify(normalizeAnyDashboardDocument(document), null, 2);
}
