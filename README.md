# Quiz Bee 🐝

Quiz Bee is a real-time, Kahoot-style multiplayer quiz application. It allows hosts to create custom question sets and run live trivia games where participants compete by answering on their mobile devices while watching a shared "Big Screen" for questions and live leaderboards.

![Quiz Bee Logo](/placeholder-if-any.png)

## 🌟 Features

- **Real-time Gameplay**: Powered by WebSockets (Socket.io) for instant question reveals, timer syncing, and answer submissions.
- **Three Core Views**:
  - **Host Dashboard**: Create question sets, launch games, control the pace (pause/skip), and reveal answers.
  - **Participant UI**: A mobile-first interface for players to join with a PIN, answer questions, and view personal score streaks.
  - **Big Screen Display**: A shared view for projecting the lobby, live questions, answer distribution charts, and the final animated podium.
- **Dynamic Scoring Engine**: Points are awarded based on both accuracy and speed. Consecutive correct answers build streaks for score multipliers.
- **Question Editor**: Built-in visual editor with drag-and-drop reordering for creating and managing quiz sets.
- **Persistence**: Questions, participants, and game results are securely stored using Supabase (PostgreSQL).

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, CSS Modules (Glassmorphism UI), Recharts (for charts), Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: Supabase (PostgreSQL)
- **Testing**: Playwright (E2E testing), Vitest (Unit testing)

## 📁 Project Structure

```text
quizbee/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # React Contexts (SocketContext, AuthContext)
│   │   └── views/       # Page views (Host, Participant, Screen)
├── backend/             # Node.js backend
│   ├── src/
│   │   ├── config/      # Env and DB configs
│   │   ├── services/    # Core game logic (GameStateManager)
│   │   └── socket/      # Socket.io event handlers
├── tests/               # E2E Playwright tests
└── quizbee-srs-v1.0.md  # Software Requirements Specification
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- Supabase account (for database setup)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/quizbee.git
cd quizbee
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory with your Supabase credentials:
```env
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal and navigate to the client directory:
```bash
cd client
npm install
```

Start the frontend development server:
```bash
npm run dev
```

### 4. Running E2E Tests
To ensure the game loop functions correctly from end-to-end:
```bash
npm install # in the root directory for Playwright
npx playwright install
npx playwright test
```

## 🎮 How to Play

1. **Host a Game**: Navigate to the Host view. Create a question set using the Editor, then click "Start Game".
2. **Open the Screen**: Open the Big Screen view (typically projected) to display the Room PIN.
3. **Join as Participant**: Players navigate to the Join view on their phones, enter the Room PIN, and choose a display name.
4. **Play**: The host launches questions, participants answer, and scores update live on the Big Screen!

## 📝 License

This project is licensed under the MIT License.
