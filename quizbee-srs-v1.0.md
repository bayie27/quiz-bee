# Software Requirements Specification
## [PLACEHOLDER] — Quiz Bee Web Application
**Version:** 1.0  
**Date:** June 15, 2026  
**Author:** Dani  
**Organization:** Junior Philippine Computer Society – De La Salle Lipa (JPCS-DLSL)  
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Roles](#3-user-roles)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 Session & Room Management
   - 4.2 Participant Joining
   - 4.3 Question Management
   - 4.4 Game Flow
   - 4.5 Scoring
   - 4.6 Leaderboard & Podium
   - 4.7 Big Screen Display
   - 4.8 Participant Phone Experience
   - 4.9 Result Card
   - 4.10 Host Controls
   - 4.11 Theming & Branding
   - 4.12 Sound Effects
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture](#6-system-architecture)
7. [WebSocket Event Reference](#7-websocket-event-reference)
8. [Data Models](#8-data-models)
9. [Scoring Formula](#9-scoring-formula)
10. [Screen Inventory](#10-screen-inventory)
11. [Constraints & Assumptions](#11-constraints--assumptions)
12. [Out of Scope](#12-out-of-scope)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for **[PLACEHOLDER]**, a real-time quiz bee web application designed for live in-venue events hosted by JPCS-DLSL. The system supports up to 500 simultaneous participants joining via their smartphones while questions are projected on a big screen controlled by a host.

### 1.2 Scope
[PLACEHOLDER] is a browser-based, mobile-responsive web application with no native app installation required. It consists of three primary interfaces:
- **Participant view** — accessed on participants' phones via PIN or QR code
- **Host dashboard** — PIN-protected control panel for the emcee
- **Big screen display** — projected view showing questions, answers, and leaderboards

The system is reusable across different events with per-event customization of branding and question sets.

### 1.3 Definitions

| Term | Definition |
|---|---|
| **Session** | A single instance of a quiz game from lobby open to game end |
| **Room** | The persistent entity that hosts sessions; single-room model, replayable |
| **Question Set** | A saved collection of questions used in a session |
| **Host** | The emcee who controls the game via the host dashboard |
| **Participant** | A student who joins and answers questions on their phone |
| **Big Screen** | The projected display showing questions and results to the audience |
| **Streak** | Consecutive correct answers by a single participant |
| **Podium** | End-game dramatic reveal animation for top 5 participants |
| **Result Card** | Shareable image generated at game end for each participant |

### 1.4 References
- Don't Tip It! SRS v4 (JPCS-DLSL internal)
- Grad Capsule SRS (JPCS-DLSL internal)

---

## 2. Overall Description

### 2.1 Product Perspective
[PLACEHOLDER] is a standalone web application built for in-venue use on a local or hosted network. It is designed for events where:
- A host projects one browser window on a large screen
- Up to 500 participants connect via personal smartphones
- Questions are answered in real time with live scoring and feedback

### 2.2 Product Functions (Summary)
- Room creation, reset, and replay management
- Participant joining via PIN and QR code
- Four question types: multiple choice, true/false, identification, image-based
- Real-time answer submission with per-question countdown timers
- Speed-based and streak-based scoring
- Host-controlled answer reveal and leaderboard display
- End-game podium animation and downloadable IG story result cards
- Per-event theming (logo, colors, event name)
- Question set editor and JSON/CSV/Excel import

### 2.3 Target Users
- **Primary:** JPCS-DLSL event hosts and IT/CS/EMC/ACT student participants
- **Secondary:** Other student organizations or academic events reusing the platform

### 2.4 Operating Environment
- **Frontend:** Modern mobile browsers (Chrome, Safari, Firefox) on Android and iOS
- **Big Screen:** Desktop browser (Chrome recommended) on a projected display
- **Network:** Any network with internet access — in-venue WiFi, mobile data, or LAN. Participants do not need to be on the same network as the host.
- **Hosting:** Node.js server deployable on cloud (Railway, Render, etc.); Supabase for database and storage

---

## 3. User Roles

| Role | Description | Authentication |
|---|---|---|
| **Host** | Controls game flow, manages questions, triggers reveals | PIN-protected dashboard |
| **Participant** | Joins game, submits answers, views personal score | Name + section at join |
| **Big Screen** | Passive display of game state; no interaction | None (open URL) |

---

## 4. Functional Requirements

### 4.1 Session & Room Management

| ID | Requirement |
|---|---|
| FR-01 | The system shall support a single persistent room that can be reset and replayed without redeploying. |
| FR-02 | The host shall be able to reset the room to lobby state, clearing all participants and scores, without altering the saved question set. |
| FR-03 | The room shall have a configurable maximum participant cap (default: 500). |
| FR-04 | The system shall maintain in-memory game state (scores, streaks, current question, participant list) during an active session. |
| FR-05 | At game end, the system shall persist final scores and participant data to Supabase PostgreSQL. |

### 4.2 Participant Joining

| ID | Requirement |
|---|---|
| FR-06 | Participants shall join the room by entering a numeric PIN on the join screen. |
| FR-07 | The system shall display a QR code on the big screen and lobby that encodes the join URL with the PIN pre-filled. |
| FR-08 | Participants shall provide a display name and section upon joining. |
| FR-09 | The system shall block duplicate name + section combinations. An error message shall be shown if a duplicate is detected. |
| FR-10 | Joining shall be blocked once the game has started. Participants attempting to join mid-game shall see a "Game already in progress" message. |
| FR-11 | If a participant disconnects and reconnects within 10 seconds using the same name + section, the system shall restore their session (score, streak, current question state) seamlessly. |
| FR-12 | If the reconnection grace period (10 seconds) expires, the participant's slot shall be released and they shall not be able to rejoin. |

### 4.3 Question Management

#### 4.3.1 Question Types

| ID | Requirement |
|---|---|
| FR-13 | The system shall support **Multiple Choice** questions with exactly 4 options (A, B, C, D) and one correct answer. |
| FR-14 | The system shall support **True or False** questions with two options. |
| FR-15 | The system shall support **Identification / Short Answer** questions where participants type a text response. Answer checking shall be case-insensitive with leading/trailing whitespace trimmed. |
| FR-16 | The system shall support **Image-based** questions where an image is displayed alongside the question text. Image-based questions may be combined with any of the above answer types. |

#### 4.3.2 Question Set Editor

| ID | Requirement |
|---|---|
| FR-17 | The host dashboard shall include a built-in question editor for creating, editing, and deleting questions. |
| FR-18 | Each question shall have the following configurable fields: question text, question type, answer options (if applicable), correct answer, per-question timer duration (seconds), and optional image attachment. |
| FR-19 | The host shall be able to reorder questions via drag-and-drop before the game starts. Question order is locked once the game begins. |
| FR-20 | The system shall allow the host to save a question set to the backend with a name for future reuse. |
| FR-21 | The system shall allow the host to export a question set as a JSON file or CSV/Excel file. |
| FR-22 | The system shall allow the host to import questions from a JSON, CSV, or Excel (.xlsx) file. The system shall validate the file structure and report errors on malformed rows. |

### 4.4 Game Flow

| ID | Requirement |
|---|---|
| FR-23 | The host shall initiate the game from the lobby state via a "Start Game" button on the host dashboard. |
| FR-24 | Before pushing a question live, the host shall see a **question preview** on their dashboard showing the full question, options, correct answer, and timer duration. |
| FR-25 | The host shall push a question live via a "Next Question" / "Launch Question" action. The question shall simultaneously appear on the big screen and all participant phones. |
| FR-26 | Each question shall have a configurable per-question countdown timer. The timer shall start immediately when the question goes live. |
| FR-27 | The backend shall hard-close the answer submission window when the timer reaches zero, rejecting any in-flight submissions that arrive after cutoff. |
| FR-28 | The host shall be able to manually close the answer window early (skip remaining time) once satisfied with the response rate. |
| FR-29 | After the answer window closes, no feedback is shown to participants until the host manually triggers the answer reveal. |
| FR-30 | The host shall manually trigger the correct answer reveal. Upon reveal, the big screen shall display the answer distribution chart and highlight the correct answer. Participant phones shall show right/wrong feedback and points earned. |
| FR-31 | The host shall manually trigger leaderboard display. The leaderboard shall show the top N participants (configurable, default: 10). |
| FR-32 | The host may trigger the leaderboard display at any point between questions (periodically) and at game end. |
| FR-33 | At game end, the system shall play the podium animation on the big screen before showing the full leaderboard. |

### 4.5 Scoring

| ID | Requirement |
|---|---|
| FR-34 | A correct answer shall award base points + speed bonus. |
| FR-35 | Base points per correct answer shall default to **1000** and be configurable by the host per question set. |
| FR-36 | Speed bonus shall be calculated as: `speed_bonus = SPEED_BONUS_MAX × (remaining_time / total_time)` where `SPEED_BONUS_MAX` defaults to **500** and is configurable. |
| FR-37 | A streak multiplier shall be applied when a participant answers correctly on consecutive questions. The multiplier table is: 1 correct = ×1.0, 2 consecutive = ×1.1, 3 consecutive = ×1.2, 4+ consecutive = ×1.5 (capped). |
| FR-38 | Final points for a correct answer: `floor((base_points + speed_bonus) × streak_multiplier)`. |
| FR-39 | An incorrect answer or no answer shall award 0 points and reset the participant's streak to 0. |
| FR-40 | First submission is final. Participants cannot change their answer after submitting. |
| FR-41 | The backend shall enforce answer cutoff (FR-27); submissions received after timer expiry shall be discarded and award 0 points. |
| FR-42 | All scoring parameters (base points, speed bonus max, streak multiplier table) shall be configurable in the question set settings. |

### 4.6 Leaderboard & Podium

| ID | Requirement |
|---|---|
| FR-43 | The host shall manually trigger leaderboard display between questions showing top N participants (name, section, score, rank). |
| FR-44 | At game end, the system shall display a **podium animation** on the big screen: participants ranked 5th through 4th are revealed first (list), then 3rd, 2nd, and 1st are revealed one by one with animation. |
| FR-45 | After the podium animation, the full final leaderboard shall be displayed on the big screen. |
| FR-46 | Participant phones shall display the participant's own running total score and rank throughout the game. |

### 4.7 Big Screen Display

| ID | Requirement |
|---|---|
| FR-47 | The big screen lobby shall display the room PIN, a QR code, the event name/logo, and a live list of joined participants with a count. |
| FR-48 | During a question, the big screen shall display: question text, answer options (for MC/TF), optional image, and a countdown timer. No live answer data (response count) shall be shown during the question. |
| FR-49 | After the host triggers answer reveal, the big screen shall display: an answer distribution bar chart (how many participants chose each option), and the correct answer highlighted. |
| FR-50 | The big screen leaderboard view shall display top N participants with name, section/year, score, and rank. |
| FR-51 | The big screen podium animation (FR-44) shall play at game end before the full leaderboard. |

### 4.8 Participant Phone Experience

| ID | Requirement |
|---|---|
| FR-52 | The participant lobby screen shall show the event name, their display name, a live participant count, and a scrollable live list of joined participants. |
| FR-53 | Between questions, the participant shall see an idle/waiting screen with event branding and a short trivia tidbit or animated holding graphic. |
| FR-54 | During a question, the participant screen shall display answer choice buttons and a countdown timer matching the big screen. |
| FR-55 | Upon answer submission, the participant shall see an **answer lock-in animation**: a color flash and checkmark bounce confirming their answer was received. |
| FR-56 | The participant screen shall display a **streak flame indicator** (🔥 + streak count) that updates after each correct answer and resets on a wrong answer. |
| FR-57 | After the host triggers answer reveal, the participant shall see: correct/incorrect indicator, points earned that round (with breakdown: base + speed bonus + streak multiplier), and their updated running total score and rank. |
| FR-58 | At game end, the participant shall see their final rank, final score, and a button to download/share their result card. |

### 4.9 Result Card

| ID | Requirement |
|---|---|
| FR-59 | The system shall generate a downloadable result card for each participant at game end. |
| FR-60 | The result card shall be formatted for Instagram Stories (9:16 aspect ratio). The participant end screen shall include an **"Add to IG Story"** button that downloads the result card as a PNG and, on supported mobile browsers, triggers the native share sheet for direct sharing to Instagram Stories. |
| FR-61 | The result card shall display: event name, event logo, participant name, section, final rank, final score, streak flame count (best streak achieved), and event branding colors. |
| FR-62 | Participants shall be able to choose a personal avatar/icon and color accent at join time, which shall appear on their result card. |
| FR-63 | The result card shall be exportable as a PNG image via a download button on the participant end screen. |

### 4.10 Host Controls

| ID | Requirement |
|---|---|
| FR-64 | The host dashboard shall be accessible at a dedicated `/host` route and protected by a configurable PIN. |
| FR-65 | The host dashboard shall display: current game state, participant count, current question preview, live answer count + percentage (how many have answered), and game controls. |
| FR-66 | The host shall be able to **pause the timer** mid-question. The timer shall freeze on all client screens simultaneously. |
| FR-67 | The host shall be able to **skip a question**, advancing to the next without revealing an answer. Skipped questions award 0 points to all participants. |
| FR-68 | The host shall be able to **kick a participant** by name from the dashboard during the game. The kicked participant's session shall be terminated. |
| FR-69 | The host shall see an **"All answers in" indicator**: a live count and percentage of participants who have submitted answers for the current question. |

### 4.11 Theming & Branding

| ID | Requirement |
|---|---|
| FR-71 | The host shall be able to configure per-event branding: event name, logo image upload, and primary/accent color scheme. |
| FR-72 | Event branding shall be applied consistently across the big screen, participant screens, and result cards. |
| FR-73 | Branding configuration shall be saved to the backend and persist across session resets. |

### 4.12 Sound Effects

| ID | Requirement |
|---|---|
| FR-74 | In the last 5 seconds of a question timer, participant phones shall play a ticking sound effect. |
| FR-75 | A chime sound shall play on the participant's phone on a correct answer. |
| FR-76 | A buzz sound shall play on the participant's phone on an incorrect answer. |
| FR-77 | Participants shall be able to toggle sound effects on/off from their phone during the game. |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | The system shall support **500 concurrent WebSocket connections** without degradation in real-time responsiveness. |
| NFR-02 | Answer submissions shall be processed and acknowledged within **500ms** under peak load (all 500 participants submitting simultaneously). |
| NFR-03 | The participant UI shall be **mobile-first and responsive**, optimized for screens 375px–430px wide. |
| NFR-04 | The big screen UI shall be optimized for **1920×1080 (1080p)** projected display. |
| NFR-05 | The system shall function over any network (in-venue WiFi, mobile data, or internet) as long as participants can reach the server's public URL. No same-network requirement is imposed. |
| NFR-06 | The system shall gracefully handle **participant disconnections** without crashing the server or affecting other participants. |
| NFR-07 | Game state shall be recoverable from server memory within the 10-second grace period for reconnecting participants. |
| NFR-08 | The result card PNG generation shall complete within **3 seconds** per participant on modern mobile browsers. |
| NFR-09 | The question set import shall validate and report errors within **2 seconds** for files up to 500 rows. |
| NFR-10 | The system shall prevent **duplicate WebSocket connections** per participant slot (only the latest connection is active). |

---

## 6. System Architecture

### 6.1 Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Clients                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Participant │  │  Host        │  │  Big Screen  │  │
│  │  Phone       │  │  Dashboard   │  │  Display     │  │
│  │  (React)     │  │  (React)     │  │  (React)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │    Socket.io    │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js + Express + Socket.io              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Game State  │  │  Room        │  │  Score       │  │
│  │  Manager     │  │  Manager     │  │  Engine      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  Question    │  │  File Import │                     │
│  │  Service     │  │  Service     │                     │
│  └──────────────┘  └──────────────┘                     │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────────┐
              │              Supabase               │
              │  ┌─────────────┐  ┌─────────────┐  │
              │  │  PostgreSQL │  │   Storage   │  │
              │  │  (question  │  │  (question  │  │
              │  │  sets,      │  │   images,   │  │
              │  │  results,   │  │   logos)    │  │
              │  │  branding)  │  │             │  │
              │  └─────────────┘  └─────────────┘  │
              └─────────────────────────────────────┘
```

### 6.2 Socket.io Room Structure

| Socket.io Room | Members | Purpose |
|---|---|---|
| `game` | All participants | Receive question events, submit answers |
| `host` | Host dashboard | Receive full game state, send control events |
| `screen` | Big screen display | Receive display events (questions, reveals, leaderboard) |

### 6.3 State Management

- **In-memory (server):** Active session state — participant list, scores, streaks, current question, timer state, answer submissions
- **Supabase PostgreSQL:** Question sets, branding config, final session results, participant history
- **Supabase Storage:** Question images, event logo uploads
- **Client (React state):** Local UI state only — no authoritative game state on client

---

## 7. WebSocket Event Reference

### 7.1 Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `participant:join` | `{ name, section, pin }` | Participant attempts to join room |
| `participant:rejoin` | `{ name, section, sessionToken }` | Participant reconnects within grace period |
| `participant:answer` | `{ questionId, answer, timestamp }` | Participant submits answer |
| `host:auth` | `{ pin }` | Host authenticates dashboard |
| `host:start_game` | `{ questionSetId }` | Host starts the game |
| `host:launch_question` | `{}` | Host pushes next question live |
| `host:pause_timer` | `{}` | Host pauses the countdown |
| `host:resume_timer` | `{}` | Host resumes the countdown |
| `host:skip_question` | `{}` | Host skips current question |
| `host:reveal_answer` | `{}` | Host triggers answer reveal |
| `host:show_leaderboard` | `{}` | Host triggers leaderboard display |
| `host:kick_participant` | `{ participantId }` | Host kicks a participant |
| `screen:register` | `{}` | Big screen registers as display client |

### 7.2 Server → Client Events

| Event | Payload | Recipients | Description |
|---|---|---|---|
| `join:success` | `{ participantId, sessionToken, avatarOptions }` | Participant | Join confirmed |
| `join:error` | `{ reason }` | Participant | Join rejected (duplicate, game started, cap reached) |
| `lobby:update` | `{ participants[], count }` | All | Participant list updated |
| `game:started` | `{}` | All | Game has begun, joining now blocked |
| `question:preview` | `{ question, options, answer, timer }` | Host | Question preview before launch |
| `question:live` | `{ questionId, type, text, options, image, timer }` | Participants, Screen | Question is now live |
| `timer:tick` | `{ remaining }` | All | Timer update (every second) |
| `timer:paused` | `{ remaining }` | All | Timer paused |
| `timer:resumed` | `{ remaining }` | All | Timer resumed |
| `answer:locked` | `{ questionId }` | Participant | Answer received confirmation |
| `question:closed` | `{ questionId, totalAnswers, totalParticipants }` | Host | Answer window closed |
| `answer:revealed` | `{ correct, distribution{} }` | All | Answer reveal with distribution |
| `score:update` | `{ points, breakdown, totalScore, rank, streak }` | Participant | Personal score update |
| `leaderboard:show` | `{ top[{ rank, name, section, score, streak }] }` | Screen, Participants | Leaderboard display |
| `podium:play` | `{ top5[{ rank, name, section, score }] }` | Screen | Podium animation trigger |
| `game:ended` | `{ finalLeaderboard[] }` | All | Game over |
| `result:card` | `{ rank, score, bestStreak, eventName, branding }` | Participant | Result card data |
| `participant:kicked` | `{}` | Participant | Participant has been kicked |
| `host:answer_count` | `{ answered, total, percentage }` | Host | Live answer count update |

---

## 8. Data Models

### 8.1 Supabase PostgreSQL Schema

#### `question_sets`
```sql
id              SERIAL PRIMARY KEY
name            VARCHAR(255) NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
branding_id     INT REFERENCES branding(id)
scoring_config  JSONB  -- base_points, speed_bonus_max, streak_multipliers
```

#### `questions`
```sql
id              SERIAL PRIMARY KEY
question_set_id INT REFERENCES question_sets(id) ON DELETE CASCADE
order_index     INT NOT NULL
type            VARCHAR(20) NOT NULL  -- 'mcq', 'truefalse', 'identification', 'image'
text            TEXT NOT NULL
options         JSONB       -- [{label: 'A', text: '...'}, ...]
correct_answer  VARCHAR(255) NOT NULL
image_url       VARCHAR(500)
timer_seconds   INT NOT NULL DEFAULT 30
```

#### `branding`
```sql
id              SERIAL PRIMARY KEY
event_name      VARCHAR(255) NOT NULL
logo_url        VARCHAR(500)
primary_color   VARCHAR(7)   -- hex
accent_color    VARCHAR(7)   -- hex
```

#### `sessions`
```sql
id              SERIAL PRIMARY KEY
question_set_id INT REFERENCES question_sets(id)
started_at      TIMESTAMP
ended_at        TIMESTAMP
participant_count INT
```

#### `session_results`
```sql
id              SERIAL PRIMARY KEY
session_id      INT REFERENCES sessions(id)
participant_name VARCHAR(255)
section_year    VARCHAR(100)
avatar          VARCHAR(50)
accent_color    VARCHAR(7)
final_score     INT
final_rank      INT
best_streak     INT
```

### 8.2 In-Memory Game State (Server)

```js
{
  status: 'lobby' | 'active' | 'ended',
  questionSetId: Number,
  currentQuestionIndex: Number,
  currentQuestion: { ...questionData },
  timerState: {
    total: Number,
    remaining: Number,
    paused: Boolean,
    intervalId: TimerRef
  },
  participants: Map<socketId, {
    id: String,
    name: String,
    section: String,
    avatar: String,
    accentColor: String,
    score: Number,
    streak: Number,
    bestStreak: Number,
    rank: Number,
    answeredCurrentQuestion: Boolean,
    sessionToken: String,
    disconnectedAt: Timestamp | null
  }>,
  answers: Map<participantId, {
    answer: String,
    timestamp: Number,
    pointsEarned: Number,
    isCorrect: Boolean
  }>,
  answerCount: Number
}
```

---

## 9. Scoring Formula

### 9.1 Per-Question Score Calculation

```
speed_bonus = floor(SPEED_BONUS_MAX × (remaining_time / total_time))
raw_score   = BASE_POINTS + speed_bonus
streak_mult = streak_multiplier_table[min(streak, 4)]
final_score = floor(raw_score × streak_mult)
```

### 9.2 Default Configuration

| Parameter | Default Value |
|---|---|
| `BASE_POINTS` | 1000 |
| `SPEED_BONUS_MAX` | 500 |
| Streak ×1.0 | 1 consecutive correct |
| Streak ×1.1 | 2 consecutive correct |
| Streak ×1.2 | 3 consecutive correct |
| Streak ×1.5 | 4+ consecutive correct (cap) |

### 9.3 Example

> Participant answers correctly on a 3-streak, with 12s remaining on a 30s question:
```
speed_bonus = floor(500 × (12 / 30)) = floor(200) = 200
raw_score   = 1000 + 200 = 1200
streak_mult = 1.2   (3-streak)
final_score = floor(1200 × 1.2) = 1440 pts
```

---

## 10. Screen Inventory

### 10.1 Participant Screens

| Screen | Route | Description |
|---|---|---|
| Join | `/join` | PIN entry + name/section/avatar/color form |
| Lobby | `/lobby` | Waiting room, live participant list |
| Idle | `/idle` | Between-question holding screen |
| Question | `/question` | Answer choices + timer |
| Answer Reveal | `/reveal` | Right/wrong + score breakdown |
| Leaderboard | `/leaderboard` | Host-triggered leaderboard (participant view) |
| End | `/end` | Final rank/score + result card download |

### 10.2 Host Dashboard Screens

| Screen | Route | Description |
|---|---|---|
| Auth | `/host/login` | PIN entry |
| Dashboard Home | `/host` | Game state overview + controls |
| Question Editor | `/host/editor` | Create/edit/reorder questions |
| Question Sets | `/host/sets` | Saved sets, import/export |
| Branding | `/host/branding` | Logo, colors, event name |
| Game Control | `/host/game` | Live game controls, answer count, question preview |

### 10.3 Big Screen Screens

| Screen | Route | Description |
|---|---|---|
| Lobby | `/screen/lobby` | PIN, QR code, participant list |
| Question | `/screen/question` | Question + options + timer |
| Answer Reveal | `/screen/reveal` | Answer distribution + correct answer |
| Leaderboard | `/screen/leaderboard` | Top N participants |
| Podium | `/screen/podium` | End-game dramatic reveal animation |

---

## 11. Constraints & Assumptions

- **C-01:** The system is deployed to a cloud server (e.g. Railway, Render); global CDN or horizontal scaling is out of scope for v1.0.
- **C-02:** A single Node.js process with Socket.io handles all 500 WebSocket connections. Node's event loop is sufficient at this scale without load balancing for v1.0.
- **C-03:** Question images and event logos are stored in Supabase Storage. Image URLs are stored in the database.
- **C-04:** The result card is generated client-side using the Canvas API (or `html2canvas`) to avoid server-side image generation load.
- **C-05:** The system supports one active game session at a time (single-room model).
- **C-06:** The host device and big screen device may be the same or different machines.
- **C-07:** Participants require internet access on their devices to connect to the server. No local network constraint is imposed.
- **A-01:** Participants use modern mobile browsers (Chrome 90+, Safari 14+).
- **A-02:** Participants have internet access via venue WiFi or mobile data sufficient to maintain a WebSocket connection.
- **A-03:** The host has a reliable device and internet connection for running the dashboard during the event.

---

## 12. Out of Scope

| Feature | Notes |
|---|---|
| Multiple simultaneous rooms | Single-room model for v1.0 |
| Participant accounts / login | Name + section is sufficient for in-event use |
| Chat / participant messaging | Not needed for quiz bee format |
| Video/audio questions | Image-based only for v1.0 |
| Anti-cheat / answer encryption | Trusted in-venue audience assumed |
| Email notifications | Not applicable to this system |
| Native mobile app | Browser-based only |
| Global leaderboard across sessions | Per-session results only |
| Horizontal scaling / Redis | Single-process Node.js sufficient for v1.0 |
| Partial credit for identification | Exact match (case-insensitive) only |

---

*SRS v1.0 — [PLACEHOLDER] Quiz Bee App — JPCS-DLSL — June 15, 2026*
