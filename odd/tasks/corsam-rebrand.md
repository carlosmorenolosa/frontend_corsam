# Feature: Corsam brand identity rebrand (UX/UI wash)

Apply the Corsam corporate identity (from https://www.corsam.es) to the whole
app: monochrome palette (black/white/grays), Rubik headings, Open Sans body,
straight edges, solid black primary actions, kicker-style labels.

## Specs

- S1: "quiero darle un lavado de cara al frontend y la experiencia de UX y UI" — full rebrand of every screen: login, sidebar, and all 4 views plus ErrorBoundary.
- S2: "traernos la identidad de la web del cliente para que sienta la aplicación como suya propia" — identity extracted from corsam.es: black #000 primary, white, grays #5F656F/#F5F5F5, no gradients, no rounded corners (0px), Rubik 700 headings, Open Sans body, uppercase tracked kicker labels.
- S3: Blue/cyan gradient palette (150 usages in 7 files) is fully removed from the UI; no blue/cyan Tailwind classes remain in src/.
- S4: Design tokens centralized in tailwind.config.js (corsam colors + font families); Google Fonts loads Rubik + Open Sans in index.html; Montserrat removed.
- S5: Semantics preserved: error red stays; all interactive behavior (forms, buttons, navigation) unchanged — visual-only change.
- S6: Verification: build green, grep proves zero blue/cyan classes, visual screenshots of login + main app against dev server.

## Tasks

- T1 [S4] Design tokens: tailwind.config.js (corsam palette, Rubik/Open Sans), index.html fonts, index.css base. Route: inline. Commit.
- T2 [S1,S2] LoginScreen rebrand (black solid button, straight edges, kicker labels). Route: inline. Commit.
- T3 [S1,S2] App.jsx: sidebar (black active bar), topbar, layout backgrounds. Route: inline. Commit.
- T4 [S1,S3] Systematic de-blue in BudgetAutomationTool, PartidasExplorer, PartidasChatbot, DashboardObra, ErrorBoundary. Route: inline. Commit.
- T5 [S6] Verification: build, grep audit, playwright screenshots of login + app. Route: inline. Commit (docs/evidence).

## Log

- L1: "Quiero darle un lavado de cara al frontend y la experencia de UX y UI... que mejor que traernos la identidad de la web del cliente para que sienta la aplicación como suya propia" + URL https://www.corsam.es/pages/corsam.php; "el cliente es corsam. Es lavado de cara completo."
- L2: Design proposal approved: "Sí, dale duro, a desarrollar el cambio capitán". Monochrome tokens, Rubik/Open Sans, straight edges, black solid primary.
