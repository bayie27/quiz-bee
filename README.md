# JPCS Quiz Game

JPCS Quiz Game is a real-time, single-room quiz bee web app for JPCS-DLSL live events. It has three surfaces: a host dashboard for running the game, a participant mobile view for answering, and a big-screen view for projection.

The current product identity is fixed as **JPCS Quiz Game**. Configurable event branding, event logos, theme colors, and participant accent colors are intentionally removed from the current direction.

## Live Paths

- Host dashboard: https://quizbee-frontend-soky.onrender.com/host
- Participant join: https://quizbee-frontend-soky.onrender.com/join
- Big screen: https://quizbee-frontend-soky.onrender.com/screen

The big-screen QR code and join prompt should point participants to the live participant join URL, not to localhost.

## What It Does

- Hosts create, rename, delete, import, export, and edit question sets.
- Participants join one active room using a room PIN, display name, section, and geometric avatar badge.
- The host starts a game, runs a countdown before Question 1, launches questions, pauses/resumes timers, skips questions, reveals early, shows leaderboards, ends early, and resets the room.
- Participants answer MCQ, True/False, or identification questions from their phones.
- The backend owns scoring, timers, answer validation, leaderboard rank, reconnect state, and final result cards.
- The big screen shows lobby join details, QR code, participant list, countdown, live questions, answer distributions, leaderboards, and final podium.
- Participants can save a PNG result card at the end of the game.

## Current UX Direction

The UI follows the official Bauhaus design system in [design-jpcs-quiz-game.md](./design-jpcs-quiz-game.md):

- Fixed colors: red, blue, yellow, black, white/off-white, plus strong supporting option colors for E/F choices.
- Geometric avatar badges instead of emoji avatars.
- Thick black borders, hard offset shadows, square or circular geometry, and no gradients/glassmorphism.
- Mobile participant screens are optimized for roughly 375-430px wide phones.
- Big-screen views are designed for projected display, including 1920x1080 checks.

## User Roles

### Host

- Logs in with the host PIN.
- Selects a question set and starts the game.
- Controls live flow: launch, pause, resume, skip, reveal early, leaderboard, end game, reset room.
- Manages question sets in the editor.
- Can kick participants from the room.

### Participant

- Joins with room PIN, real display name, section, and avatar badge.
- Answers live questions.
- Sees lock-in, reveal feedback, points, current score, current rank, streak feedback, leaderboard, and final result card.
- Can mute/unmute local game sounds with the top-right icon button.

### Big Screen Operator / Audience

- Opens the /screen route on the projector display.
- Shows room PIN, QR code, participant lobby, questions, timers, answer distribution, leaderboard, and podium.
- Does not control the game.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Socket.io client, Framer Motion, Recharts, html2canvas, qrcode.react, dnd-kit.
- Backend: Node.js, Express 5, Socket.io, Multer, dotenv.
- Persistence: Supabase PostgreSQL and Storage through server-side Supabase client usage.
- Tests: backend Node test scripts, Vitest for focused frontend tests, Playwright for E2E smoke flow.
- Hosting: Render backend web service and frontend static site via render.yaml.

## Repository Layout

~~~text
quizbee/
  backend/
    src/
      app.js
      server.js
      config/
      routes/
      services/
      socket/
      tests/
  client/
    src/
      components/
      config/
      contexts/
      hooks/
      views/
      index.css
  tests/
  AGENTS.md
  README.md
  render.yaml
  reqs-jpcs-quiz-game.md
  plan-jpcs-quiz-game.md
  design-jpcs-quiz-game.md
~~~

The local task backlog file, tasks-jpcs-quiz-game.md, is intentionally ignored and should stay local.

## Local Setup

### Prerequisites

- Node.js 18 or newer. The current local environment has been tested with Node 22.
- npm.
- A Supabase project if you want persisted question sets/results.
- Playwright browsers if running E2E tests.

### Install

~~~bash
npm install
cd backend && npm install
cd ../client && npm install
~~~

### Backend Environment

Create backend/.env:

~~~env
PORT=3001
HOST_PIN=1234
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MAX_PARTICIPANTS=1000
REJOIN_GRACE_PERIOD_MS=10000
~~~

Notes:

- SUPABASE_SERVICE_ROLE_KEY must stay server-side only.
- The backend also accepts SUPABASE_KEY, but SUPABASE_SERVICE_ROLE_KEY is the documented name.
- If Supabase URL/key are missing, the backend can start, but database-backed question sets and persistence will not work correctly.

### Client Environment

Create client/.env when you need non-default URLs:

~~~env
VITE_SERVER_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
VITE_PUBLIC_JOIN_URL=https://quizbee-frontend-soky.onrender.com/join
~~~

Notes:

- VITE_SERVER_URL is used by Socket.io.
- VITE_API_URL is used by REST calls. If omitted, the client falls back to VITE_SERVER_URL.
- VITE_PUBLIC_JOIN_URL is shown on the big screen and encoded in the QR code.

### Run Locally

Terminal 1:

~~~bash
cd backend
npm run dev
~~~

Terminal 2:

~~~bash
cd client
npm run dev
~~~

Default local routes:

- Host dashboard: http://localhost:5173/host
- Participant join: http://localhost:5173/join
- Big screen: http://localhost:5173/screen
- Backend health/root: http://localhost:3001/

If npm run dev in the backend fails with EADDRINUSE :::3001, another process is already using port 3001. Stop the existing backend process or change PORT in backend/.env and update the client env URL.

## Question Set Editor

The host editor supports:

- Create question set.
- Rename question set.
- Delete question set with confirmation.
- Add, edit, reorder, and delete questions.
- Import CSV file.
- Paste JSON.
- Export CSV.
- Export JSON.
- MCQ options from 2 to 6 choices.
- Add/delete MCQ options.
- True/False defaults to A=True and B=False.
- Identification questions use an exact accepted answer.

Question set deletion is app-level destructive behavior. The UI asks for confirmation before deleting the set and its questions.

## Import Formats

### CSV

Use **Import CSV File** for .csv uploads.

Required header row:

~~~csv
text,type,timer_seconds,correct_answer,option_a,option_b,option_c,option_d,option_e,option_f
~~~

Valid type values:

- mcq
- truefalse
- identification

Rules:

- MCQ supports 2-6 options.
- MCQ correct_answer must be A, B, C, D, E, or F depending on available options.
- True/False maps A=True and B=False; correct_answer must be A or B.
- Identification ignores option columns and uses correct_answer as the exact accepted answer.

Example:

~~~csv
text,type,timer_seconds,correct_answer,option_a,option_b,option_c,option_d,option_e,option_f
"What does CPU stand for?",mcq,30,A,"Central Processing Unit","Central Program Unit","Computer Personal Unit","Central Power Unit",,
"JavaScript is a compiled language.",truefalse,15,B,,,,,,
"What markup language is used for web pages?",identification,20,HTML,,,,,,
~~~

### JSON

Use **Paste JSON** for pasted JSON arrays.

Expected shape:

~~~json
[
  {
    "text": "What does CPU stand for?",
    "type": "mcq",
    "timer_seconds": 30,
    "correct_answer": "A",
    "options": [
      { "label": "A", "text": "Central Processing Unit" },
      { "label": "B", "text": "Central Program Unit" },
      { "label": "C", "text": "Computer Personal Unit" },
      { "label": "D", "text": "Central Power Unit" }
    ]
  },
  {
    "text": "JavaScript is a compiled language.",
    "type": "truefalse",
    "timer_seconds": 15,
    "correct_answer": "B"
  },
  {
    "text": "What markup language is used for web pages?",
    "type": "identification",
    "timer_seconds": 20,
    "correct_answer": "HTML"
  }
]
~~~

## Game Flow

1. Host logs in at /host.
2. Participants join at /join using the room PIN shown on the host and big screen.
3. Big screen is opened at /screen and registers itself as the display surface.
4. Host selects a question set and starts the game.
5. Backend emits a 5-second countdown before Question 1.
6. Question 1 launches automatically when countdown reaches zero.
7. Later questions are launched by the host from the next-question preview.
8. Timer expiry closes the question and automatically reveals the answer.
9. Manual **Reveal Early** uses the same reveal path before the timer expires.
10. **Skip** closes the current question, shows a skipped/waiting state, and moves host to the next preview.
11. Leaderboard can be shown between questions.
12. End game shows final result cards to participants and podium on the big screen.
13. Reset room returns the system to lobby state.

## Scoring Behavior

- Correct answers earn base points plus speed bonus.
- Streak multipliers reward consecutive correct answers.
- Wrong answers earn 0 for the question and reset streak.
- Answer windows close when the timer expires, when the host skips, or when the answer is revealed.
- Ranking and total score are authoritative from the backend.

See backend/src/services/scoring.js and backend/src/tests/scoring.test.js for exact scoring formulas and regression examples.

## Persistence And Supabase

Supabase is used for persisted quiz data and result/session storage where configured. The backend service role key must never be exposed to the client.

Current REST resources:

- GET /api/question-sets
- POST /api/question-sets
- PUT /api/question-sets/:setId
- DELETE /api/question-sets/:setId
- GET /api/questions/:setId
- POST /api/questions/:setId

The active app is still a single-room MVP. Do not introduce multi-room behavior unless the requirements and plan are updated first.

## Socket Events At A Glance

Host emits:

- host:auth
- host:start_game
- host:launch_question
- host:pause_timer
- host:resume_timer
- host:skip_question
- host:reveal_answer
- host:show_leaderboard
- host:kick_participant
- host:end_game
- host:reset_room

Participant emits:

- participant:join
- participant:rejoin
- participant:answer

Screen emits:

- screen:register

Common server events include:

- lobby:update
- game:started
- game:countdown
- question:live
- timer:tick
- timer:paused
- timer:resumed
- question:closed
- question:skipped
- answer:revealed
- score:update
- leaderboard:show
- podium:play
- game:ended
- room:reset
- result:card

## Commands

Root:

~~~bash
npm install
npx playwright test
~~~

Backend:

~~~bash
cd backend
npm run dev
npm start
npm test
npm run test:scoring
npm run test:gameloop
~~~

Client:

~~~bash
cd client
npm run dev
npm run typecheck
npm run build
npm run preview
npm run lint
npx vitest run src/views/participant/Join.test.tsx
~~~

## Testing Status And Known Caveats

Known current verification status on the fix/ux-fixes branch:

- cd backend && npm test passes.
- cd client && npm run typecheck passes.
- cd client && npm run build passes.
- cd client && npx vitest run src/views/participant/Join.test.tsx passes.
- Rendered smoke check of /join passes at local Vite dev URL.
- cd client && npm run lint currently fails because ESLint is parsing TypeScript/TSX as plain JavaScript. This is an ESLint parser/configuration issue to fix separately.

## Deployment On Render

The repo includes render.yaml for Render Blueprint deployment:

- quizbee-backend: Node web service from backend/.
- quizbee-frontend: static site from client/dist.

Render environment variables to review:

Backend:

~~~env
NODE_ENV=production
PORT=3001
HOST_PIN=1234
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MAX_PARTICIPANTS=1000
REJOIN_GRACE_PERIOD_MS=10000
~~~

Frontend:

~~~env
VITE_SERVER_URL=<backend host from Render>
VITE_PUBLIC_JOIN_URL=https://quizbee-frontend-soky.onrender.com/join
~~~

For production, change HOST_PIN from the default and set real Supabase credentials in Render, not in source code.

## Security And Safety Notes

- Never commit API keys, service-role keys, tokens, or secrets.
- Keep Supabase service role access server-side only.
- Do not run destructive database/storage operations without explicit approval.
- Do not disable or loosen Row Level Security policies without calling it out explicitly.
- Question set deletion is destructive and should stay confirmation-gated in the UI.
- The backend is authoritative for scores, timers, rankings, answer validation, reconnect grace, and final results.

## Active Specs

- Requirements: [reqs-jpcs-quiz-game.md](./reqs-jpcs-quiz-game.md)
- Architecture plan: [plan-jpcs-quiz-game.md](./plan-jpcs-quiz-game.md)
- Design system: [design-jpcs-quiz-game.md](./design-jpcs-quiz-game.md)
- Agent guide: [AGENTS.md](./AGENTS.md)
- Legacy source reference: [quizbee-srs-v1.0.md](./quizbee-srs-v1.0.md)

## License

This repository currently inherits the package-level license metadata in backend/package.json (ISC). Add a root LICENSE file before presenting the project as formally licensed.
