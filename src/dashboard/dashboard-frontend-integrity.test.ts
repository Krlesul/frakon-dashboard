import { describe, expect, it } from 'vitest';
import { arrayBufferToHex, frakonFrontendResourceUrl, verifyFrakonFrontendIntegrity } from './dashboard-frontend-integrity';

function digestBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.match(/../g)!.map((part) => Number.parseInt(part, 16)));
  return bytes.buffer;
}

describe('FRAKON frontend runtime integrity', () => {
  it('builds the versioned same-origin resource URL', () => {
    expect(frakonFrontendResourceUrl('0.16.0-alpha.1')).toBe('/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1');
  });

  it('converts digest bytes to lowercase hex', () => {
    expect(arrayBufferToHex(new Uint8Array([0, 15, 16, 255]).buffer)).toBe('000f10ff');
  });

  it('reports verified when served bytes match the backend hash', async () => {
    const expected = 'ab'.repeat(32);
    const requests: string[] = [];
    const result = await verifyFrakonFrontendIntegrity({
      version: '0.16.0-alpha.1',
      expectedSha256: expected,
      fetcher: async (url) => {
        requests.push(url);
        return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
      },
      digest: async () => digestBuffer(expected),
    });
    expect(requests).toEqual(['/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1']);
    expect(result).toMatchObject({ status: 'verified', expectedSha256: expected, actualSha256: expected });
  });

  it('reports mismatch without treating it as a transport error', async () => {
    const expected = 'aa'.repeat(32);
    const actual = 'bb'.repeat(32);
    const result = await verifyFrakonFrontendIntegrity({
      version: '0.16.0-alpha.1',
      expectedSha256: expected,
      fetcher: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
      digest: async () => digestBuffer(actual),
    });
    expect(result).toMatchObject({ status: 'mismatch', expectedSha256: expected, actualSha256: actual });
  });

  it('stays unavailable when the backend does not advertise a valid hash', async () => {
    expect(await verifyFrakonFrontendIntegrity({ version: '0.16.0-alpha.1', expectedSha256: 'bad' })).toEqual({
      status: 'unavailable',
      resourceUrl: '/frakon-dashboard/frakon-dashboard.js?v=0.16.0-alpha.1',
    });
  });
});
