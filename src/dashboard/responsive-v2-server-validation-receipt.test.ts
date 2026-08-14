import { describe, expect, it } from 'vitest';
import { responsiveV2ServerValidationReceipt } from './responsive-v2-server-validation-receipt';

describe('responsive v2 server validation receipt', () => {
  it('accepts only the exact candidate revision validated by the server', () => {
    expect(responsiveV2ServerValidationReceipt('candidate-r2', 'candidate-r2')).toEqual({
      candidateRevision: 'candidate-r2',
      validatedRevision: 'candidate-r2',
      valid: true,
    });
    expect(responsiveV2ServerValidationReceipt('candidate-r3', 'candidate-r2').valid).toBe(false);
    expect(responsiveV2ServerValidationReceipt('candidate-r3').valid).toBe(false);
    expect(responsiveV2ServerValidationReceipt('', '').valid).toBe(false);
  });
});
