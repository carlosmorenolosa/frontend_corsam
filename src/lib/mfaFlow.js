// src/lib/mfaFlow.js
// Pure decision logic for the Supabase Auth + TOTP MFA login flow.
//
// Kept free of network and React dependencies so the flow rules are
// directly unit-testable (see mfaFlow.test.js).

const VERIFIED_STATUSES = new Set(['verified']);

/**
 * Pick the next MFA step after a successful email+password login.
 *
 * @param {Array<{id: string, status: string, factor_type: string}>} factors
 *   Result of `supabase.auth.mfa.listFactors()` (`data.totp`) flattened, or
 *   an empty array when the user has no factor enrolled yet.
 * @returns {'enroll'|'challenge'} Next step to show in the UI.
 */
export const decideMfaStep = (factors) => {
  const hasVerifiedFactor = (factors ?? []).some(
    (f) => VERIFIED_STATUSES.has(f.status)
  );
  return hasVerifiedFactor ? 'challenge' : 'enroll';
};

/**
 * Whether the current session has completed login plus a verified second
 * factor. Mirrors Supabase's authenticator assurance level (AAL): only
 * `aal2` grants entry to the application.
 *
 * @param {{currentLevel: string, nextLevel: string}|null|undefined} assurance
 *   Result of `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
 * @returns {boolean}
 */
export const isFullyAuthenticated = (assurance) => {
  return assurance?.currentLevel === 'aal2';
};

/**
 * Id of the verified TOTP factor to challenge, or null when the user has
 * none. Note: in supabase-js both `data.totp` and `data.all` from
 * `mfa.listFactors()` include unverified factors, so filtering by
 * `status` is required here.
 *
 * @param {Array<{id: string, status: string, factor_type: string}>} factors
 * @returns {string|null}
 */
export const pickVerifiedFactorId = (factors) => {
  return (factors ?? []).find((f) => VERIFIED_STATUSES.has(f.status))?.id ?? null;
};
