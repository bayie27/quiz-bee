PLAN: JPCS Quiz Game
Derived from: Reqs v1.0

1. ARCHITECTURE OVERVIEW
High-level shape: JPCS Quiz Game is a single-room client-server web app. The React frontend renders host, participant, and big screen routes; the Express backend exposes REST setup endpoints and Socket.io real-time game control; Supabase stores durable quiz and result data.

Why this architecture: A single authoritative Node/Socket.io process keeps timer, scoring, and ranking consistent for a live event, while REST remains sufficient for setup workflows that do not need millisecond real-time synchronization.

2. TECH STACK
Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Socket.io Client, Framer Motion, Recharts, qrcode.react, html2canvas, dnd-kit.

Backend: Node.js, Express 5, Socket.io 4, CommonJS modules, Multer for upload handling.

Data layer: Supabase PostgreSQL and Supabase Storage through `@supabase/supabase-js` on the backend.

Other services/SDKs: Render deployment blueprint, Playwright for E2E smoke tests, Vitest/Testing Library available on the client.

3. COMPONENTS / MODULES
Component: Client Router and Views
  Responsibility: Render route-level host, participant, and screen interfaces.
  Satisfies: FR-2 through FR-55.
  Key interfaces/exports: Routes under `/host`, `/join`, `/lobby`, `/question`, `/reveal`, `/leaderboard`, `/end`, and `/screen/*`.

Component: Socket Context
  Responsibility: Own client socket connection, subscribe to global game events, and expose real-time state to views.
  Satisfies: FR-8, FR-21 through FR-55.
  Key interfaces/exports: `SocketProvider`, `useSocket`, shared state for participant, lobby, timer, current question, reveal data, host state, leaderboard, and podium.

Component: REST API
  Responsibility: Provide non-real-time setup and persisted data operations.
  Satisfies: FR-11 through FR-19, FR-56, FR-59.
  Key interfaces/exports: `/api/question-sets`, `/api/questions/:setId`, and upload endpoints that remain after branding cleanup.

Component: Socket Handlers
  Responsibility: Authenticate host sockets, register screen sockets, process participant joins/rejoins/answers, and broadcast game events.
  Satisfies: FR-2 through FR-10, FR-20 through FR-55.
  Key interfaces/exports: `participant:join`, `participant:rejoin`, `participant:answer`, `host:auth`, `host:start_game`, `host:launch_question`, `host:pause_timer`, `host:resume_timer`, `host:skip_question`, `host:reveal_answer`, `host:show_leaderboard`, `host:kick_participant`, `host:reset_room`, `host:end_game`, `screen:register`.

Component: Game State Manager
  Responsibility: Maintain authoritative in-memory room state, participants, questions, answer window, timer state, scoring, rankings, reconnects, and final results.
  Satisfies: FR-1, FR-5 through FR-10, FR-20 through FR-40, FR-56 through FR-58.
  Key interfaces/exports: participant mutation methods, game lifecycle methods, scoring/ranking helpers, timer helpers, result serializers.

Component: Scoring Service
  Responsibility: Compute score breakdown for correct answers using base points, speed bonus, and streak multipliers.
  Satisfies: FR-34 through FR-39.
  Key interfaces/exports: `calculateScore`, `DEFAULT_SCORING_CONFIG`.

Component: Supabase Config
  Responsibility: Initialize the backend Supabase client from environment variables and allow safe fallback when not configured.
  Satisfies: FR-56 through FR-59, NFR-4.
  Key interfaces/exports: Supabase client singleton or `null`.

4. DATA MODEL
Entity: `room_settings`
  Fields: `id`, `host_pin`, `room_pin`, `max_participants`, `reconnect_grace_seconds`.
  Relationships: Read by backend on boot to configure the single active room.

Entity: `question_sets`
  Fields: `id`, `name`, `scoring_config`, `created_at`.
  Relationships: Has many `questions`; referenced by `sessions`.

Entity: `questions`
  Fields: `id`, `question_set_id`, `order_index`, `type`, `text`, `options`, `correct_answer`, `timer_seconds`, `image_url`.
  Relationships: Belongs to `question_sets`.

Entity: `sessions`
  Fields: `id`, `question_set_id`, `started_at`, `ended_at`, `participant_count`.
  Relationships: Belongs to a `question_set`; has many `session_results`.

Entity: `session_results`
  Fields: `id`, `session_id`, `participant_name`, `section`, `avatar`, `final_score`, `final_rank`, `best_streak`, `avg_answer_time_ms`.
  Relationships: Belongs to `sessions`.
  Note: Active code and Supabase schema use `section`; legacy source material may still mention `section_year`.

Entity: In-memory participant
  Fields: `id`, `name`, `section`, `avatar`, `score`, `streak`, `bestStreak`, `rank`, `answeredCurrentQuestion`, `sessionToken`, `disconnectedAt`, `totalAnswerTimeMs`, `correctAnswerCount`.
  Relationships: Lives only in the active backend process and maps to a Socket.io socket ID.

Entity: Legacy branding
  Fields: Removed from active app behavior; legacy source material may still mention `branding`, `event_name`, `logo_url`, `primary_color_hex`, and `accent_color_hex`.
  Relationships: Deprecated and removed from active Supabase schema after explicit approval.

5. FILE/FOLDER STRUCTURE
quizbee/
  client/
    src/
      contexts/
      hooks/
      views/
        host/
        participant/
        screen/
      index.css
  backend/
    src/
      config/
      routes/
      services/
      socket/
        handlers/
      tests/
  tests/
    e2e/
  reqs-jpcs-quiz-game.md
  plan-jpcs-quiz-game.md
  tasks-jpcs-quiz-game.md
  design-jpcs-quiz-game.md
  agents.md

6. CROSS-CUTTING DECISIONS
Error handling convention: REST returns JSON `{ error }`; socket handlers emit scoped error events with `{ reason }`.

State management approach: Backend game state is authoritative and in-memory for the active room. Client state is derived from Socket.io events through `SocketContext`.

UI design approach: Fixed Bauhaus design system, no runtime configurable branding, no glassmorphism, no gradients, no soft shadows.

Accessibility bar: WCAG AA text contrast, visible focus states, semantic controls, keyboard navigation for host flows, and minimum 44x44px touch targets for participant controls.

Deferred decisions (not blocking): RLS hardening strategy for permissive public policies; requires explicit review before policy changes.

7. SECURITY & DATA ACCESS
Who can read/write what:
- Host: Can read and write question sets/questions, upload question images, control game state, kick participants, reset room, and end game after PIN authentication.
- Participant: Can join, rejoin, submit answers, receive personal score/result data, and receive shared game display events. Cannot write question data or control game state.
- Big Screen: Can register for passive display state and receive shared display events. Cannot submit answers or control game state.
- Backend: Can access Supabase using server-side credentials and owns all authoritative mutations.

Auth approach: PIN-based host authentication and room PIN participant joining. Participant continuity uses server-issued session tokens stored client-side for reconnect.

Secrets used by this feature:
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SERVER_URL`

Secret checks:
- All secrets confirmed in `.env`, not hardcoded: [ ]
- `.env` confirmed in `.gitignore`: [x]

Row Level Security (Supabase):
- Tables touched by this app: `room_settings`, `question_sets`, `questions`, `sessions`, `session_results`.
- Current backend uses server-side Supabase access. RLS changes must be explicitly reviewed before any migration.
- Deprecated branding table cleanup was executed after approval; future storage deletion remains approval-gated if any legacy assets are discovered.

Irreversible operations this feature introduces:
- Deleting legacy logo assets from Supabase Storage if any are discovered.
- Broad deletes of question sets, questions, sessions, or results.
- Any production migration or RLS policy change.

8. RISKS / OPEN TECHNICAL QUESTIONS
- Existing UI uses inline styles and dark glass tokens, so applying Bauhaus is a redesign pass rather than a small theme edit.
- Legacy source material still contains old branding and `section_year` references; active code/specs should stay on the fixed JPCS identity and `section` field.
- Existing docs and comments contain text encoding corruption that should be cleaned during polish.
- E2E tests depend on running dev servers and a configured Supabase-backed setup; test data strategy may need hardening.
