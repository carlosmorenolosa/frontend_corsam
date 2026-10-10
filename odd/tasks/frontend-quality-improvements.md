# Feature: frontend-quality-improvements (frontend_corsam)

## Goal
Apply non-behavior-altering frontend quality improvements from the deep audit, verify the app builds and starts, and push.

## Constraints
- No functionality changes (login flow, data flows, UI behavior stay identical).
- Out of scope (requires infra/product decisions): server-side auth, Supabase RLS, xlsx migration, Vite/React upgrades, input validation that blocks previously-possible states, i18n.

## Tasks
- [ ] T1: Hygiene cleanup — strip debug/payload console.logs, delete committed artifacts (presupuesto.bc3, remove_rca.cjs), gitignore *.bc3, remove dead code (fmtUnit, unused supabase client import, dead error destructure), Lambda URLs -> import.meta.env with current values as fallback.
- [ ] T2: Robustness & structure — ErrorBoundary in main.jsx, shared src/lib/api.js data layer (single fetchAllPartidas), extract SidebarContent from App.jsx to module level, stable list keys, StrictMode welcome-message duplication guard, React.memo on chart components.
- [ ] T3: Accessibility — labels on login inputs, aria-labels on icon-only buttons, keyboard-accessible sortable table headers with aria-sort, retry buttons on error states.
- [ ] T4: Verification — npm install, production build passes, dev server boots, no console regressions from build.
- [ ] T5: Push feature branch to origin.

## Evidence
(work-unit commit hashes recorded per task)
