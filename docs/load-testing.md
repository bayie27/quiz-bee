# Load Testing And Event Readiness

Use this before any 1500+ student live event. Normal unit tests prove game rules; this load test proves the live Socket.io path can survive the event shape.

## Prerequisites

Install dependencies first:

```bash
npm install
cd client && npm install
cd ../backend && npm install
```

For local tests without Supabase room settings, start the backend with a room cap that matches the event:

```bash
cd backend
MAX_PARTICIPANTS=2500 ROOM_PIN=000000 npm run dev
```

On Windows PowerShell:

```powershell
cd backend
$env:MAX_PARTICIPANTS='2500'
$env:ROOM_PIN='000000'
npm run dev
```

If Supabase `room_settings` is configured, make sure `max_participants` is at least the target load because database settings override environment defaults.

## Participant Load Test

In another terminal:

```bash
node loadtest/participants.js --users 2000 --url http://localhost:3001 --pin 000000 --hold-seconds 180
```

For staging:

```bash
node loadtest/participants.js --users 2000 --url https://your-backend.example.com --pin 000000 --hold-seconds 300
```

While the load test is running:

1. Open the host UI.
2. Confirm the participant count reaches the target.
3. Start a real question set.
4. Launch at least 3 questions.
5. Reveal answers and show the leaderboard.
6. Watch backend CPU, memory, restarts, and Socket.io disconnects in the hosting dashboard.

The simulator automatically answers every `question:live` event. By default it spreads answers randomly across `250-5000ms` after each question is received. The root npm script is still available as `npm run loadtest:participants` for default local runs, but direct `node` invocation is more reliable when passing many flags across shells.

Useful options:

```bash
--users 2000
--url http://localhost:3001
--pin 000000
--join-rate 100
--join-interval-ms 1000
--hold-seconds 300
--answer-min-ms 250
--answer-max-ms 5000
--answer-mode random
--answer-mode fixed --fixed-answer A
--transports websocket,polling
```


## Render Event Rehearsal

The actual event must be tested against the same Render backend that students will use, not only localhost. For an expected 1500 participants, use 2000 simulated participants as the minimum rehearsal load. A second stress pass at 2250 is useful if 2000 passes cleanly.

Before testing Render, verify these production settings in the Render dashboard or blueprint:

- Backend service is not on the Free instance type. The current blueprint says `plan: free`, which is not appropriate for a live 1500 participant event.
- `MAX_PARTICIPANTS` is at least `2500`, unless Supabase `room_settings.max_participants` is higher and intentionally overrides it.
- `ROOM_PIN` or Supabase `room_settings.room_pin` matches the PIN used by the simulator.
- The backend has already been redeployed with the latest load-test and room-cap changes.

Render rehearsal command:

```bash
node loadtest/participants.js --users 2000 --url https://quizbee-backend-eiwt.onrender.com --pin 000000 --hold-seconds 300 --join-rate 100
```

This URL is the backend used by the current hosted frontend. Run this while manually driving the real hosted host and screen routes.

## What Passing Means

For a 1500 student event, require a Render rehearsal with at least 33 percent headroom:

- 2000 simulated participants for a 1500 student event.
- 100 percent of expected participants can join before the quiz starts.
- No backend process restart.
- No unexplained Socket.io disconnect spike.
- `joinLatencyMs.p95` under 2000ms during the join window.
- `answerLockLatencyMs.p95` under 1000ms during each live question.
- `answers.locked` matches the expected number of answers for each launched question.
- Host and screen remain responsive while answers arrive.
- Final leaderboard and result cards appear correctly.

If any item fails, treat the system as not ready for the live event until the bottleneck is fixed and the same test passes.

## Current Risks To Watch

- The backend broadcasts the full participant list on every join. At 1500+ joins, that can become expensive for host/screen clients and network bandwidth.
- The backend recalculates ranks on every answer. At 1500+ near-simultaneous answers, this can become CPU-heavy.
- The backend emits host answer-count updates on every answer. This is useful, but the host dashboard may need throttling if the browser struggles.
- Result persistence happens at the end of the game. Confirm Supabase accepts the full result insert for the target participant count.
