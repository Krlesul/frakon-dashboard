import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_MAX_SERIALIZED_BYTES,
  dashboardSerializedBytes,
  dashboardWithinSerializedByteLimit,
} from './dashboard-document-limits';

describe('dashboard document JSON persistence limits', () => {
  it('counts UTF-8 bytes rather than JavaScript string code units', () => {
    expect(dashboardSerializedBytes({ value: 'é' })).toBe(new TextEncoder().encode(JSON.stringify({ value: 'é' })).byteLength);
  });

  it('enforces the canonical serialized-byte limit', () => {
    expect(dashboardWithinSerializedByteLimit({ value: 'ok' })).toBe(true);
    expect(dashboardWithinSerializedByteLimit({ value: 'x'.repeat(DASHBOARD_MAX_SERIALIZED_BYTES) })).toBe(false);
  });

  it('rejects runtime values that JSON would silently corrupt or cannot serialize', () => {
    expect(dashboardSerializedBytes({ value: Number.POSITIVE_INFINITY })).toBeUndefined();
    expect(dashboardSerializedBytes({ value: BigInt(1) })).toBeUndefined();
    expect(dashboardSerializedBytes({ value: () => 'runtime' })).toBeUndefined();
    expect(dashboardSerializedBytes({ values: [1, undefined, 3] })).toBeUndefined();
  });

  it('allows undefined object properties because standard JSON persistence omits optional absent fields', () => {
    expect(dashboardSerializedBytes({ present: 1, optional: undefined })).toBe(
      new TextEncoder().encode('{"present":1}').byteLength,
    );
  });

  it('rejects cyclic object graphs', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(dashboardSerializedBytes(value)).toBeUndefined();
  });
});
