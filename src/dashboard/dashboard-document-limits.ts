export const DASHBOARD_MAX_SERIALIZED_BYTES = 2_000_000;

/**
 * Return the UTF-8 byte size of the JSON persistence form when the value is
 * serializable without unsafe numeric/runtime-only values. Object properties
 * whose value is undefined follow normal JSON semantics and are omitted;
 * undefined array entries are rejected because JSON would turn them into null.
 */
export function dashboardSerializedBytes(value: unknown): number | undefined {
  try {
    const serialized = JSON.stringify(value, function (_key, nested: unknown) {
      if (typeof nested === 'number' && !Number.isFinite(nested)) {
        throw new Error('Non-finite JSON number.');
      }
      if (typeof nested === 'bigint' || typeof nested === 'function' || typeof nested === 'symbol') {
        throw new Error('Unsupported JSON value.');
      }
      if (nested === undefined && Array.isArray(this)) {
        throw new Error('Undefined array entry.');
      }
      return nested;
    });
    if (serialized === undefined) return undefined;
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    return undefined;
  }
}

export function dashboardWithinSerializedByteLimit(
  value: unknown,
  maxBytes = DASHBOARD_MAX_SERIALIZED_BYTES,
): boolean {
  const bytes = dashboardSerializedBytes(value);
  return bytes !== undefined && bytes <= maxBytes;
}
