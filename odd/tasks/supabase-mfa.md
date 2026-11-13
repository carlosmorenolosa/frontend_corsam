# Feature: Supabase Auth + 2FA (TOTP MFA) — corsam-ia-presupuestos

Migrate the current frontend-only env-var login to real Supabase Auth
(email + password) with a mandatory second factor: TOTP configured with
Google Authenticator via QR code enrollment.

## Specs

- S1: "además de la capa de login de usuario y contraseña, metamos autenticación 2FA" — login step stays, 2FA verification is required after it before entering the app.
- S2: "que se pueda configurar con Google Authenticator por ejemplo" — the second factor is TOTP, enrolled by scanning a QR code (Google Authenticator compatible) and verified at every login.
- S3: Architecture decision: user selected "A: Supabase Auth + MFA (recomendado)" — secret lives server-side in Supabase, verification is server-side, the env-var credential login is replaced.
- S4: The bundle must not contain any TOTP secret or password (no VITE_-based credentials for auth).
- S5: App entry must restore a session only at assurance level aal2 (login + verified second factor); logout calls real `signOut`.
- S6: Flow logic (no-factor → enroll, verified-factor → challenge, AAL decision) is extracted into testable pure modules with vitest coverage; RED first per rule.
- S7: Provide setup documentation (Supabase user creation, MFA activation, env vars) and `.env.example`; legacy auth env vars (`VITE_USER_CORSAM`, `VITE_PASSWORD_CORSAM`) are removed from the login path.

## Tasks

- T1 [S4] Supabase client module `src/lib/supabase.js` (reject missing env config early). Route: inline. Commit.
- T2 [S1,S2,S4,S6] Extract MFA flow decision logic `src/lib/mfaFlow.js` + vitest RED→GREEN. Route: inline. Commit.
- T3 [S1,S2,S4] Rewrite `LoginScreen.jsx`: signInWithPassword → MFA gate (enrollment QR / code challenge). Route: inline. Commit.
- T4 [S5] `App.jsx`: session restore via `getAuthenticatorAssuranceLevel`, logout via `signOut`. Route: inline. Commit.
- T5 [S7] Docs: `docs/2fa-supabase-setup.md` + `.env.example`; remove stale auth env comments. Route: inline. Commit.
- T6 Final verification: build passes, full flow verified against real Supabase project (requires user-supplied env config). Route: inline + gentle-ai-verify (high risk: auth).

## Log

- L1: "Quiero que ademas de la capa de login de usuario y contraseña, metamos autenticacion 2FA y que se pueda configurar con Google Aunthenticator por ejemplo"
- L2: Architecture question answered: user chose Supabase Auth + MFA (option A) over client-side TOTP or a custom lambda.
