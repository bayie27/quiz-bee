import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Participant Views
import Join from './views/participant/Join';
import Lobby from './views/participant/Lobby';
import Idle from './views/participant/Idle';
import Question from './views/participant/Question';
import Reveal from './views/participant/Reveal';
import Leaderboard from './views/participant/Leaderboard';
import End from './views/participant/End';

// Host Views
import Auth from './views/host/Auth';
import Dashboard from './views/host/Dashboard';
import Editor from './views/host/Editor';
import Sets from './views/host/Sets';
import Branding from './views/host/Branding';
import Game from './views/host/Game';

// Big Screen Views
import ScreenLobby from './views/screen/ScreenLobby';
import ScreenQuestion from './views/screen/ScreenQuestion';
import ScreenReveal from './views/screen/ScreenReveal';
import ScreenLeaderboard from './views/screen/ScreenLeaderboard';
import Podium from './views/screen/Podium';

import { SocketProvider } from './contexts/SocketContext';

interface MobileLayoutProps {
  children: React.ReactNode;
}

function MobileLayout({ children }: MobileLayoutProps) {
  return <div className="mobile-layout">{children}</div>;
}

function App() {
  return (
    <SocketProvider>
      <Routes>
        {/* Root redirect to participant join */}
        <Route path="/" element={<Navigate to="/join" replace />} />

        {/* 10.1 Participant Screens (Mobile Layout) */}
        <Route path="/join" element={<MobileLayout><Join /></MobileLayout>} />
        <Route path="/lobby" element={<MobileLayout><Lobby /></MobileLayout>} />
        <Route path="/idle" element={<MobileLayout><Idle /></MobileLayout>} />
        <Route path="/question" element={<MobileLayout><Question /></MobileLayout>} />
        <Route path="/reveal" element={<MobileLayout><Reveal /></MobileLayout>} />
        <Route path="/leaderboard" element={<MobileLayout><Leaderboard /></MobileLayout>} />
        <Route path="/end" element={<MobileLayout><End /></MobileLayout>} />

        {/* 10.2 Host Dashboard Screens (Full Width) */}
        <Route path="/host/login" element={<Auth />} />
        <Route path="/host" element={<Dashboard />} />
        <Route path="/host/editor" element={<Editor />} />
        <Route path="/host/sets" element={<Sets />} />
        <Route path="/host/branding" element={<Branding />} />
        <Route path="/host/game" element={<Game />} />

        {/* 10.3 Big Screen Screens (Full Width) */}
        <Route path="/screen/lobby" element={<ScreenLobby />} />
        <Route path="/screen/question" element={<ScreenQuestion />} />
        <Route path="/screen/reveal" element={<ScreenReveal />} />
        <Route path="/screen/leaderboard" element={<ScreenLeaderboard />} />
        <Route path="/screen/podium" element={<Podium />} />
      </Routes>
    </SocketProvider>
  );
}

export default App;
