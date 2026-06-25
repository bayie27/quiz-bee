Reqs: JPCS Quiz Game
Version 1.0 - June 25, 2026

1. PURPOSE & SCOPE
JPCS Quiz Game is a real-time, browser-based quiz bee application for JPCS-DLSL live events. A host controls a single shared game, participants join on mobile phones with a room PIN, and a projected big screen displays the lobby, questions, answer reveals, leaderboards, and final podium. The software exists to run fast, reliable in-venue competitions without requiring participant accounts or native app installation.

Explicitly OUT OF SCOPE:
- Configurable event branding, event logo uploads, host-selected theme colors, and per-event theming.
- Participant accent color selection or any cosmetic personalization beyond avatar selection.
- Multiple simultaneous rooms or tournament-wide multi-room orchestration.
- Native iOS/Android apps or mobile app store distribution.
- Participant accounts, passwords, email login, or long-term player profiles.
- Video/audio question media for v1.0; image-based questions remain in scope.
- Global leaderboards across separate sessions.

2. ACTORS / USER CLASSES
Host: Authenticates with a host PIN, manages question sets, starts and controls the game, launches questions, pauses/resumes timers, skips questions, reveals answers, shows leaderboards, kicks participants, resets the room, and ends the game.

Participant: Joins with a room PIN, display name, section, and avatar; waits in the lobby; answers live questions; sees lock-in, reveal, score, streak, rank, leaderboard, and final result card states.

Big Screen Operator / Audience: Opens the projected screen route and watches the passive display for lobby QR/PIN, questions, answer reveals, leaderboard, and final podium. The big screen does not control game state.

3. FUNCTIONAL REQUIREMENTS

3.1 Room, Auth, and Joining
FR-1: The system shall operate one active quiz room for v1.0.
FR-2: The host shall authenticate with a configured host PIN before accessing game controls.
FR-3: The system shall expose a room PIN that participants use to join the lobby.
FR-4: A participant shall provide display name, section, and avatar before joining.
FR-5: The system shall reject duplicate participant name + section combinations within the current session.
FR-6: The system shall reject participant joins when the room is full.
FR-7: The system shall reject new participant joins after the game has started.
FR-8: If a participant disconnects during an active game and reconnects within the configured grace period using the same session token, the system shall restore their score, streak, rank, and current question state.
FR-9: If a participant fails to reconnect before the grace period expires, the system shall remove them from active play for the current session.
FR-10: The host shall be able to reset the room to lobby state without deleting saved question sets.

3.2 Question Management
FR-11: The host shall create and save question sets.
FR-12: The host shall create, edit, delete, and reorder questions before starting a game.
FR-13: The system shall support Multiple Choice questions with options and one correct answer.
FR-14: The system shall support True/False questions with one correct answer.
FR-15: The system shall support Identification / Short Answer questions where matching is case-insensitive and trims leading/trailing whitespace.
FR-16: The system shall support image-based questions by displaying an image alongside question text.
FR-17: The host shall import questions from supported structured files and receive clear validation errors for malformed rows.
FR-18: The host shall export saved questions in supported interchange formats.
FR-19: Question order shall be locked once a game starts.

3.3 Game Loop and Host Control
FR-20: The host shall select a question set and start a game only when at least one participant is present.
FR-21: The host shall launch questions one at a time.
FR-22: The system shall broadcast live questions to participants and the big screen without exposing the correct answer.
FR-23: The host shall see the current or next question preview including the correct answer.
FR-24: Each question shall have a server-controlled countdown timer.
FR-25: The host shall be able to pause and resume the timer.
FR-26: The host shall be able to skip the current question, close the answer window, and award zero points for skipped/no-answer outcomes.
FR-27: The host shall be able to reveal the answer after closing or ending a question.
FR-28: The host shall be able to show a leaderboard between questions.
FR-29: The host shall be able to kick a participant from the current session.
FR-30: The host shall be able to manually end the game.

3.4 Answering, Scoring, and Ranking
FR-31: A participant shall submit at most one answer per question.
FR-32: The backend shall reject answers submitted after the answer window closes.
FR-33: The backend shall reject answers while the timer is paused.
FR-34: Correct answers shall receive base points plus a speed bonus based on remaining time.
FR-35: Incorrect answers and no-answer outcomes shall receive zero points.
FR-36: Consecutive correct answers shall increase streak and apply a capped streak multiplier.
FR-37: Incorrect answers shall reset the participant streak to zero.
FR-38: The system shall track best streak per participant for final results.
FR-39: Rankings shall sort by score descending with fastest average correct answer time as tie-breaker.
FR-40: The host shall receive a live answer count after each accepted submission.

3.5 Participant Experience
FR-41: The participant lobby shall show joined participants and current participant count.
FR-42: The participant question screen shall show question text, image if present, answer controls, and countdown state.
FR-43: On answer submission, the participant shall see an answer lock-in confirmation.
FR-44: On answer reveal, the participant shall see correctness, points earned, running total, rank, and scoring breakdown when available.
FR-45: The participant shall see a streak indicator during play when streak is active.
FR-46: The participant shall see host-triggered leaderboard screens.
FR-47: At game end, the participant shall receive a result card containing fixed JPCS Quiz Game identity, participant name, section, avatar, final rank, final score, and best streak.
FR-48: The participant result card shall support sharing through Web Share API where available and downloading as a PNG fallback.
FR-49: Participant sound effects shall include countdown tick, correct chime, incorrect buzz, and a mute toggle that persists during the session.

3.6 Big Screen Experience
FR-50: The big screen lobby shall show fixed JPCS Quiz Game identity, room PIN, QR code join link, participant count, and participant list.
FR-51: The big screen question view shall show question text, image if present, answer options where applicable, and countdown state.
FR-52: The big screen answer reveal shall show answer distribution and identify the correct answer.
FR-53: The big screen leaderboard shall show top N participants with rank, name, section, and score.
FR-54: The big screen podium shall animate final results for the top participants at game end.
FR-55: Big screen views shall be passive and driven by server events, not manual state mutation.

3.7 Persistence and Deployment
FR-56: The system shall persist question sets and questions in Supabase.
FR-57: The system shall load room settings from Supabase when configured, with safe defaults when Supabase is unavailable.
FR-58: The system shall persist completed session metadata and participant results when Supabase is configured.
FR-59: The system shall store question images through server-side upload handling.
FR-60: The deployment configuration shall support separate hosted frontend and backend services.

4. NON-FUNCTIONAL REQUIREMENTS
NFR-1: Performance - The game shall support at least 500 connected participants in a single room for v1.0.
NFR-2: Latency - Live game events should reach connected clients within 500ms under normal hosted network conditions.
NFR-3: Timer authority - Server timer state is authoritative; clients only render received timer events.
NFR-4: Security - Supabase service role keys and other secrets shall remain server-side and never be exposed to the client.
NFR-5: Security - Host controls shall require PIN authentication before use.
NFR-6: Platform - Participant UI shall be optimized for modern mobile browsers around 375px-430px width.
NFR-7: Platform - Big screen UI shall be readable at 1920x1080 projection size.
NFR-8: Accessibility - Interactive controls shall have visible focus states, semantic labels where needed, and minimum 44x44px touch targets.
NFR-9: Reliability - Participant reconnection shall preserve score and streak when completed within the configured grace period.
NFR-10: Maintainability - Future UI work shall follow the Bauhaus design system in `design-jpcs-quiz-game.md`.

5. TECH STACK & CONSTRAINTS
Locked stack:
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Socket.io Client, Framer Motion, Recharts, qrcode.react, html2canvas, dnd-kit.
- Backend: Node.js, Express, Socket.io, CommonJS modules.
- Data layer: Supabase PostgreSQL and Supabase Storage, accessed from the backend.
- Tests: Backend Node test scripts, frontend TypeScript/lint/build checks, Playwright E2E smoke flow.

Explicitly avoid:
- Redux or another global state library unless the architecture plan is changed first.
- Configurable theme colors, event logo upload, or per-event branding.
- Client-side authoritative scoring, timing, ranking, or answer validation.
- Hardcoded secrets or service role keys.
- Destructive DB/storage operations without explicit user approval.

Existing systems to integrate with / reuse:
- Current `SocketContext` client state and Socket.io event names.
- Current backend `gameStateManager`, scoring service, and socket handlers.
- Existing Supabase tables for question sets, questions, room settings, sessions, and session results.
- Legacy `quizbee-srs-v1.0.md` as source reference only.

6. ACCEPTANCE CRITERIA
GIVEN the host enters the correct PIN WHEN authentication succeeds THEN the host can access dashboard controls.

GIVEN a participant joins with valid room PIN, unique name + section, and avatar WHEN the game is still in lobby THEN they enter the lobby and all clients receive updated participant count.

GIVEN a participant submits an answer before timer expiry WHEN it is their first submission for the question THEN the backend locks the answer, updates scoring state, and emits answer count to the host.

GIVEN the timer reaches zero WHEN a participant submits afterward THEN the backend rejects the answer and no score is awarded.

GIVEN the host reveals an answer WHEN submissions are closed THEN participants receive score updates and the big screen receives answer distribution.

GIVEN the host ends the game WHEN results are computed THEN participants receive result card data and the big screen receives podium data.

GIVEN a future cleanup task removes branding WHEN verification runs THEN no UI route, API route, requirement, or task preserves configurable event branding.

7. OPEN QUESTIONS / ASSUMPTIONS
- Assumption: `quizbee-srs-v1.0.md` remains in place as legacy source material until explicitly archived.
- Assumption: Full Supabase schema cleanup for branding is desired but requires separate approval before destructive migration or storage deletion.
- Assumption: The current single-room model remains correct for v1.0.
- Assumption: Participant avatar selection remains cosmetic and does not affect scoring or identity uniqueness.
