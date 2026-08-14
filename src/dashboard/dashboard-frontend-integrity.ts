export type FrakonFrontendIntegrityStatus = 'verified' | 'mismatch' | 'unavailable' | 'error';

export interface FrakonFrontendIntegrityResult {
  status: FrakonFrontendIntegrityStatus;
  expectedSha256?: string;
  actualSha256?: string;
  resourceUrl: string;
  error?: string;
}

interface FetchResponseLike {
  ok: boolean;
  status?: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

type FetchLike = (input: string) => Promise<FetchResponseLike>;
type DigestLike = (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>;

export function frakonFrontendResourceUrl(version: string): string {
  const suffix = encodeURIComponent(version || 'development');
  return `/frakon-dashboard/frakon-dashboard.js?v=${suffix}`;
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function verifyFrakonFrontendIntegrity(input: {
  version: string;
  expectedSha256?: string;
  fetcher?: FetchLike;
  digest?: DigestLike;
}): Promise<FrakonFrontendIntegrityResult> {
  const resourceUrl = frakonFrontendResourceUrl(input.version);
  const expected = input.expectedSha256?.trim().toLowerCase();
  if (!expected || !/^[0-9a-f]{64}$/.test(expected)) {
    return { status: 'unavailable', resourceUrl };
  }

  const fetcher = input.fetcher ?? (typeof fetch === 'function' ? (fetch as unknown as FetchLike) : undefined);
  const digest = input.digest ?? (typeof crypto !== 'undefined' && crypto.subtle
    ? crypto.subtle.digest.bind(crypto.subtle) as DigestLike
    : undefined);
  if (!fetcher || !digest) {
    return { status: 'unavailable', expectedSha256: expected, resourceUrl };
  }

  try {
    const response = await fetcher(resourceUrl);
    if (!response.ok) {
      return {
        status: 'error',
        expectedSha256: expected,
        resourceUrl,
        error: `HTTP ${response.status ?? 'error'}`,
      };
    }
    const bytes = await response.arrayBuffer();
    const actual = arrayBufferToHex(await digest('SHA-256', bytes));
    return {
      status: actual === expected ? 'verified' : 'mismatch',
      expectedSha256: expected,
      actualSha256: actual,
      resourceUrl,
    };
  } catch (error) {
    return {
      status: 'error',
      expectedSha256: expected,
      resourceUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
