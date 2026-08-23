import { describe, expect, it } from 'vitest';
import { frakonBuildIdentityMatches } from './dashboard-frontend-build';

describe('FRAKON frontend build identity', () => {
  it('matches identical packaged versions and commits', () => {
    expect(frakonBuildIdentityMatches(
      { version: '0.16.0-alpha.1', sourceCommit: 'abc' },
      { version: '0.16.0-alpha.1', sourceCommit: 'abc' },
    )).toBe(true);
  });

  it('rejects version or source commit mismatches', () => {
    expect(frakonBuildIdentityMatches(
      { version: '0.16.0-alpha.1', sourceCommit: 'abc' },
      { version: '0.16.0-alpha.2', sourceCommit: 'abc' },
    )).toBe(false);
    expect(frakonBuildIdentityMatches(
      { version: '0.16.0-alpha.1', sourceCommit: 'abc' },
      { version: '0.16.0-alpha.1', sourceCommit: 'def' },
    )).toBe(false);
  });

  it('allows development builds to compare by version only', () => {
    expect(frakonBuildIdentityMatches(
      { version: '0.16.0-alpha.1', sourceCommit: 'development' },
      { version: '0.16.0-alpha.1', sourceCommit: 'abc' },
    )).toBe(true);
  });
});
