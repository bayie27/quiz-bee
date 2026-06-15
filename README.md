# JPCS Quiz Game (Quiz Bee) 🐝

[![React 19](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=for-the-badge&logo=socket.io)](https://socket.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Render Blueprint](https://img.shields.io/badge/Render-Blueprint-4640e5?style=for-the-badge&logo=render)](https://render.com)

JPCS Quiz Game (Quiz Bee) is a real-time, Kahoot-style multiplayer quiz platform custom-built for **JPCS-DLSL**. Host live quizzes where players join via mobile phones using a unique Room PIN, answer questions in real time, build score streaks, and watch the animated final podium on a shared **Big Screen**.

---

## 🌟 Key Features

### 💻 Three Interactive Roles
*   **Host Dashboard**: Authenticate via Host PIN, create/edit question sets with a drag-and-drop editor, control the game flow (pause/resume/skip), kick players in real-time, and reveal live results.
*   **Participant Mobile UI**: A responsive, mobile-first controller optimized for 375px–430px screens. Features a grid-based emoji avatar picker, interactive HSL color accents, streak tracking, lock-in confirmation animations, and personal scorecards.
*   **Big Screen Display**: Designed for projection in halls or classrooms. Displays the animated player lobby, live question timers, responsive answer distribution charts, and a dynamic 3D-style podium for the winners.

### ⚡ Technical Capabilities
*   **Participant Reconnection & Grace Period (FR-11 / FR-12)**: Native `localStorage` session persistence. If a player disconnects, they can rejoin within a 10-second grace period without losing their score, active streak, or state.
*   **Programmatic Audio Engine (FR-74 - FR-77)**: Implements Web Audio API to dynamically synthesize countdown ticks, correct-answer chimes, and incorrect-answer buzzes directly in the browser—meaning zero large audio file downloads. Includes a global mute/unmute toggle.
*   **Robust Excel, CSV, & JSON Import/Export (FR-21 / FR-22)**: Visual spreadsheet import engine featuring strict RFC 4180-compliant CSV and JSON validation schemas. Warns hosts about type mismatches, missing headers, or malformed rows.
*   **Sleek Glassmorphic Design**: Modern HSL-tailored dark modes, glowing neon borders, backdrop filters, and fluid spring animations powered by Framer Motion.
*   **Scale-Tested (NFR-02)**: Performance optimized to handle **1,000 concurrent players** with a $p95$ network round-trip response latency of **under 5ms** (exceeding the 500ms target).

---

## 🚀 Technology Stack

*   **Frontend**: React 19, Vite, Tailwind CSS v4, TypeScript, Recharts, Framer Motion, `@dnd-kit` (drag & drop)
*   **Backend**: Node.js, Express, Socket.io
*   **Database & Storage**: Supabase (PostgreSQL), Postgres Row-Level Security (RLS)
*   **Testing**: Playwright (E2E Integration Testing), Vitest (Unit Testing)
*   **Hosting**: Render (Web Service & Static Site)

---

## 📁 Repository Directory Structure

```text
quizbee/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # Shared layout, charts, and card UI components
│   │   ├── contexts/       # Global State Contexts (Socket, Auth)
│   │   ├── hooks/          # Custom hooks (e.g. useAudio Web Audio synthesizer)
│   │   ├── views/          # Route-level screens (Host, Participant, Screen)
│   │   └── index.css       # Core Tailwind CSS configuration
│   ├── vite.config.ts      # Vite & Proxy configuration
│   └── package.json        
├── backend/                # Node.js + Express + Socket.io Server
│   ├── src/
│   │   ├── config/         # Environment and Supabase DB config
│   │   ├── services/       # Core game state manager (Lobby, Timers, Scoring)
│   │   ├── socket/         # Socket.io connection & event handlers
│   │   └── server.js       # Express server entrypoint
│   └── package.json        
├── tests/                  # Playwright E2E Integration tests
├── render.yaml             # Render infrastructure blueprint configuration
└── README.md               # Product documentation
```

---

## 🛠️ Local Development Setup

### Prerequisites
*   Node.js (v18+)
*   Supabase Account

### 1. Clone the Repository
```bash
git clone https://github.com/bayie27/quiz-bee.git
cd quiz-bee
```

### 2. Configure the Backend Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file inside `backend/` using the following variables:
   ```env
   PORT=3001
   HOST_PIN=1234
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   MAX_PARTICIPANTS=1000
   REJOIN_GRACE_PERIOD_MS=10000
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

### 3. Configure the Client
1. Open a new terminal window and navigate to the client directory:
   ```bash
   cd client
   npm install
   ```
2. Start the Vite bundler locally:
   ```bash
   npm run dev
   ```
3. Access the interfaces:
   - **Host Dashboard**: [http://localhost:5173/host](http://localhost:5173/host)
   - **Participant Join**: [http://localhost:5173/join](http://localhost:5173/join)
   - **Big Screen Display**: [http://localhost:5173/screen](http://localhost:5173/screen)

---

## 🧪 Verification & Testing

### Typechecking (Frontend)
Run static TypeScript analysis:
```bash
cd client
npm run typecheck
```

### End-to-End Playwright Tests
Execute multi-actor game loop integration tests simulating room creation, participant joining, question streaming, answering, scoring, and leaderboard updates:
```bash
# From the root directory
npm install
npx playwright install chromium
npx playwright test
```

---

## ☁️ Cloud Deployment (Render Blueprint)

This project contains a [render.yaml](file:///c:/Users/User/Desktop/lock_in/quizbee/render.yaml) file for instant blueprint deployment on Render.

1. Commit and push your code to GitHub.
2. Go to your **Render Dashboard > New > Blueprint**.
3. Connect your repository.
4. Render will read the `render.yaml` configuration and automatically deploy:
    *   **Backend Web Service**: Running the Node/Socket.io server on the `free` tier.
    *   **Frontend Static Site**: Building and hosting the React client on the `free` tier.
5. Fill in the environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HOST_PIN`) on Render when prompted.
6. Once deployment is complete, access your platform using the following paths (replace `quizbee-frontend` with your actual Render frontend subdomain):
    *   **Host Dashboard**: `https://quizbee-frontend.onrender.com/host`
    *   **Participant Join**: `https://quizbee-frontend.onrender.com/join`
    *   **Big Screen Display**: `https://quizbee-frontend.onrender.com/screen`

---

## 📝 License

This project is licensed under the MIT License.
