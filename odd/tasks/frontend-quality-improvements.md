# Feature: frontend-quality-improvements (frontend_corsam)

## Goal
Apply non-behavior-altering frontend quality improvements from the deep audit, verify the app builds and starts, and push.

## Constraints
- No functionality changes (login flow, data flows, UI behavior stay identical).
- Out of scope (requires infra/product decisions): server-side auth, Supabase RLS, xlsx migration, Vite/React upgrades, input validation that blocks previously-possible states, i18n.

## Tasks
- [x] T1: Hygiene cleanup — strip debug/payload console.logs, delete committed artifacts (presupuesto.bc3, remove_rca.cjs), gitignore *.bc3, remove dead code (fmtUnit, unused supabase client import, dead error destructure), Lambda URLs -> import.meta.env with current values as fallback.
  - Evidence: commit f988d8b (chore: hygiene cleanup)
- [x] T2: Robustness & structure — ErrorBoundary in main.jsx, shared src/lib/api.js data layer (single fetchAllPartidas), extract SidebarContent from App.jsx to module level, stable list keys, StrictMode welcome-message duplication guard, React.memo on chart components.
  - Evidence: commit 5628b59 (refactor: robustness and structure)
- [x] T3: Accessibility — labels on login inputs, aria-labels on icon-only buttons, keyboard-accessible sortable table headers with aria-sort, retry buttons on error states.
  - Evidence: commit a65df57 (feat: accessibility)
- [x] T4: Verification — npm ci + production build (vite v4.5.14, 2582 modules, exit 0), dev server boot on :5199 serving index.html and /src/main.jsx (HTTP 200), no console.log in src/, clean git status, ErrorBoundary/api.js imports confirmed.
  - Evidence: gentle-ai-verify report, all checks pass
- [x] T5: Push feature branch to origin.
  - Evidence: push of feature/frontend-quality-improvements to origin

## Evidence
(work-unit commit hashes recorded per task)
