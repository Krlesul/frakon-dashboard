import { describe, expect, it } from 'vitest';
import { responsiveV2ServerValidationReceipt } from './responsive-v2-server-validation-receipt';

describe('responsive v2 server validation receipt', () => {
  it('accepts only the exact candidate revision with an unchanged storage proof', () => {
    expect(responsiveV2ServerValidationReceipt('candidate-r2', 'candidate-r2', 'unchanged')).toEqual({
      candidateRevision: 'candidate-r2',
      validatedRevision: 'candidate-r2',
      storageInvariant: 'unchanged',
      valid: true,
    });
    expect(responsiveV2ServerValidationReceipt('candidate-r3', 'candidate-r2', 'unchanged').valid).toBe(false);
    expect(responsiveV2ServerValidationReceipt('candidate-r3', undefined, 'unchanged').valid).toBe(false);
    expect(responsiveV2ServerValidationReceipt('', '', 'unchanged').valid).toBe(false);
  });

  it('fails closed when dry-run storage invariance cannot be proven', () => {
    expect(responsiveV2ServerValidationReceipt('candidate-r2', 'candidate-r2', 'changed-during-check').valid).toBe(false);
    expect(responsiveV2ServerValidationReceipt('candidate-r2', 'candidate-r2', 'unverifiable').valid).toBe(false);
  });
});
