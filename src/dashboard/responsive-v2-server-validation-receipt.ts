export interface ResponsiveV2ServerValidationReceipt {
  candidateRevision: string;
  validatedRevision?: string;
  valid: boolean;
}

export function responsiveV2ServerValidationReceipt(
  candidateRevision: string,
  validatedRevision?: string,
): ResponsiveV2ServerValidationReceipt {
  return {
    candidateRevision,
    validatedRevision,
    valid: candidateRevision.length > 0 && validatedRevision === candidateRevision,
  };
}
