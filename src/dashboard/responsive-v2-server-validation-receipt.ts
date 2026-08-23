import type { ResponsiveV2DryRunStorageInvariant } from './responsive-v2-dry-run-storage-proof';

export interface ResponsiveV2ServerValidationReceipt {
  candidateRevision: string;
  validatedRevision?: string;
  storageInvariant: ResponsiveV2DryRunStorageInvariant;
  valid: boolean;
}

export function responsiveV2ServerValidationReceipt(
  candidateRevision: string,
  validatedRevision: string | undefined,
  storageInvariant: ResponsiveV2DryRunStorageInvariant,
): ResponsiveV2ServerValidationReceipt {
  return {
    candidateRevision,
    validatedRevision,
    storageInvariant,
    valid:
      candidateRevision.length > 0
      && validatedRevision === candidateRevision
      && storageInvariant === 'unchanged',
  };
}
