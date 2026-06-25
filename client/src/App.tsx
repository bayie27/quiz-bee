import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Join from './views/participant/Join';
import Lobby from './views/participant/Lobby';
import Idle from './views/participant/Idle';
import Question from './views/participant/Question';
import Reveal from './views/participant/Reveal';
import Leaderboard from './views/participant/Leaderboard';
import End from './views/participant/End';

import Auth from './views/host/Auth';
import Dashboard from './views/host/Dashboard';
import Editor from './views/host/Editor';
import Sets from './views/host/Sets';
import Game from './views/host/Game';

import ScreenLobby from './views/screen/ScreenLobby';
import ScreenQuestion from './views/screen/ScreenQuestion';
import ScreenReveal from './views/screen/ScreenReveal';
import ScreenLeaderboard from './views/screen/ScreenLeaderboard';
import Podium from './views/screen/Podium';

import { SocketProvider, useSocket } from './contexts/SocketContext';

interface MobileLayoutProps {
  children: React.ReactNode;
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-dot" />
      <span className="brand-square" />
      <span className="brand-triangle" />
    </span>
  );
}

function SoundToggleIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {!muted && <path d="M16 8c1.2 1.2 1.8 2.5 1.8 4s-.6 2.8-1.8 4" />}
      {!muted && <path d="M19 5c2 2 3 4.3 3 7s-1 5-3 7" />}
      {muted && <path d="M17 9l5 5M22 9l-5 5" />}
    </svg>
  );
}

function MobileLayout({ children }: MobileLayoutProps) {
  const { isMuted, setIsMuted } = useSocket();

  return (
    <div className="mobile-layout">
      <header className="app-header">
        <div className="brand-lockup">
          <BrandMark />
          <span>JPCS Quiz Game</span>
        </div>
        <button className="bau-icon-button" onClick={() => setIsMuted(!isMuted)} aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'} type="button">
          <SoundToggleIcon muted={isMuted} />
        </button>
      </header>
      {children}
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<MobileLayout><Join /></MobileLayout>} />
        <Route path="/lobby" element={<MobileLayout><Lobby /></MobileLayout>} />
        <Route path="/idle" element={<MobileLayout><Idle /></MobileLayout>} />
        <Route path="/question" element={<MobileLayout><Question /></MobileLayout>} />
        <Route path="/reveal" element={<MobileLayout><Reveal /></MobileLayout>} />
        <Route path="/leaderboard" element={<MobileLayout><Leaderboard /></MobileLayout>} />
        <Route path="/end" element={<MobileLayout><End /></MobileLayout>} />
        <Route path="/host/login" element={<Auth />} />
        <Route path="/host" element={<Dashboard />} />
        <Route path="/host/editor" element={<Editor />} />
        <Route path="/host/sets" element={<Sets />} />
        <Route path="/host/game" element={<Game />} />
        <Route path="/screen" element={<Navigate to="/screen/lobby" replace />} />
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
