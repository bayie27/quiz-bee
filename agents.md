AGENTS.md - JPCS Quiz Game

PROJECT OVERVIEW
What this is: A real-time, single-room quiz bee web app for JPCS-DLSL live events with host, participant mobile, and projected big screen interfaces.
Tech stack: React 19 + Vite + TypeScript + Tailwind CSS v4 frontend; Node.js + Express + Socket.io backend; Supabase PostgreSQL and Storage for persisted quiz data, room settings, images, sessions, and results.

COMMANDS
Install:
- Root Playwright deps: `npm install`
- Client deps: `cd client && npm install`
- Backend deps: `cd backend && npm install`

Dev server:
- Backend: `cd backend && npm run dev`
- Client: `cd client && npm run dev`

Build:
- Client: `cd client && npm run build`

Test:
- Backend all tests: `cd backend && npm test`
- Backend scoring only: `cd backend && npm run test:scoring`
- Backend game loop only: `cd backend && npm run test:gameloop`
- E2E smoke flow: start backend and client, then run `npx playwright test` from repo root

Lint:
- Client: `cd client && npm run lint`
- Typecheck: `cd client && npm run typecheck`

CONVENTIONS
- File/folder naming: React route views use PascalCase `.tsx`; backend modules use camelCase `.js`; docs use lowercase kebab-case.
- Component structure pattern: Route-level screens live under `client/src/views/{host,participant,screen}`. Shared behavior should be extracted only when it reduces real duplication across those views.
- State management approach: Client global real-time state lives in `client/src/contexts/SocketContext.tsx`; backend authoritative game state lives in `backend/src/services/gameStateManager.js`.
- Error handling pattern: Backend REST endpoints return JSON `{ error }` with appropriate HTTP status; Socket.io handlers emit scoped `*:error` events with a `reason` string.
- Socket.io event names use `noun:verb` or established existing event names, for example `participant:join`, `host:launch_question`, `question:live`.
- UI generation must follow `design-jpcs-quiz-game.md` exactly; do not fall back to framework defaults, glassmorphism, gradients, or configurable theme colors.
- Accessibility baseline: semantic HTML, visible focus states, keyboard-navigable controls, and minimum 44x44px touch targets unless `plan-jpcs-quiz-game.md` explicitly narrows a non-interactive display surface.
- Branch naming: `feat/phase-0X-short-description`, `fix/...`, `chore/...`, or `refactor/...`.
- Never commit directly to main except the very first commit (`Initial commit`) if the repository has no default branch yet.
- Commit format: `type(scope): description`.
- Commits within a branch are per task: one logical task per commit, referencing the task ID in the footer. Do not bundle unrelated changes.

ARCHITECTURE PRINCIPLES
- The backend is authoritative for room state, participants, timers, scoring, answer validation, ranks, and reconnect grace periods.
- All live game synchronization goes through Socket.io handlers under `backend/src/socket/handlers`; clients must not infer authoritative score or timer state.
- REST endpoints are for setup and persisted resources such as question sets, questions, uploads, and non-real-time reads.
- The product has one active room for v1.0. Do not introduce multi-room behavior unless the active requirements and plan are changed first.
- Configurable event branding is being removed. Use the fixed JPCS Quiz Game identity and the Bauhaus design system instead.
- Participant personalization is avatar-only. Do not add or preserve participant accent color behavior in new work.
- Supabase service role access stays server-side only. The client must never receive service-role credentials.
- Destructive database/storage cleanup, including branding table removal or asset deletion, requires explicit user approval immediately before execution.

TESTING STRATEGY
- Backend game logic changes require focused Node tests in `backend/src/tests` and `cd backend && npm test`.
- Frontend route/UI changes require `cd client && npm run typecheck`, `cd client && npm run lint`, and `cd client && npm run build`.
- Real-time flow changes require the Playwright E2E smoke flow after starting both dev servers.
- Visual redesign work should include manual checks at participant mobile width around 375-430px, host desktop width, and 1920x1080 big screen proportions.
- Documentation-only changes must be verified by checking active spec pointers, FR/task references, and the absence of removed requirements.

DO NOT
- Do not reintroduce `/host/branding`, `/api/branding`, event logo configuration, primary/accent color configuration, or per-event theming.
- Do not introduce Redux; use the existing Socket context unless a future plan explicitly changes state management.
- Do not move authoritative scoring, timer, or ranking logic into the client.
- Do not hardcode API keys, tokens, or secrets directly in source files. Always reference `process.env`, Vite env variables, or `.env`.
- Do not run destructive commands, `DROP`, broad `DELETE`, force-push, or production migrations without explicit confirmation from the user.
- Do not modify or disable Row Level Security policies without flagging it to the user explicitly.
- Do not edit `quizbee-srs-v1.0.md` as part of cleanup unless the task explicitly says to archive or replace legacy source material.

ACTIVE SPECS
- Requirements: `reqs-jpcs-quiz-game.md`
- Architecture plan: `plan-jpcs-quiz-game.md`
- Ordered task backlog: `tasks-jpcs-quiz-game.md`
- Official design system: `design-jpcs-quiz-game.md`
- Legacy source reference: `quizbee-srs-v1.0.md`
