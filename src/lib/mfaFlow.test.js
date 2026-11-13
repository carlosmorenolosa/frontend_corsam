// src/lib/mfaFlow.test.js
// Tests for the pure MFA authentication flow decision logic.
//
// Covered rules (spec odd/tasks/supabase-mfa.md S6):
//  1. A session with no TOTP factor at all routes to enrollment.
//  2. A session with only unverified factors still routes to enrollment.
//  3. A session with a verified TOTP factor routes to challenge.
//  4. Only aal2 (login + verified second factor) counts as fully
//     authenticated; null session or aal1 does not.

import { describe, it, expect } from 'vitest';
import { decideMfaStep, isFullyAuthenticated } from './mfaFlow';

describe('decideMfaStep', () => {
  it("routes to enroll when the user has no factor at all", () => {
    expect(decideMfaStep([])).toBe('enroll');
  });

  it("routes to enroll when factors exist but none is verified", () => {
    const factors = [{ id: 'f1', status: 'unverified', factor_type: 'totp' }];
    expect(decideMfaStep(factors)).toBe('enroll');
  });

  it("routes to challenge when a verified TOTP factor exists", () => {
    const factors = [
      { id: 'f1', status: 'unverified', factor_type: 'totp' },
      { id: 'f2', status: 'verified', factor_type: 'totp' },
    ];
    expect(decideMfaStep(factors)).toBe('challenge');
  });

  it("treats a verified non-TOTP factor as enrolled for challenge", () => {
    const factors = [{ id: 'f3', status: 'verified', factor_type: 'totp' }];
    expect(decideMfaStep(factors)).toBe('challenge');
  });
});

describe('isFullyAuthenticated', () => {
  it("rejects a null assurance result", () => {
    expect(isFullyAuthenticated(null)).toBe(false);
  });

  it("rejects aal1 (login without verified second factor)", () => {
    expect(isFullyAuthenticated({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe(false);
  });

  it("rejects a session that can but has not reached aal2", () => {
    expect(isFullyAuthenticated({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe(false);
  });

  it("accepts aal2 (login plus verified second factor)", () => {
    expect(isFullyAuthenticated({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe(true);
  });
});
