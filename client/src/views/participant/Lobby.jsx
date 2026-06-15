import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Lobby() {
  const { lobbyData, currentQuestion, isGameEnded, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentQuestion) navigate('/question');
    if (isGameEnded) navigate('/end');
    
    // Also listen for game:started to go to idle screen
    const onGameStarted = () => navigate('/idle');
    if (socket) {
      socket.on('game:started', onGameStarted);
    }
    return () => {
      if (socket) socket.off('game:started', onGameStarted);
    };
  }, [currentQuestion, isGameEnded, socket, navigate]);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, alignItems: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
      <div className="glass-card animate-fade-in text-center" style={{ width: '100%' }}>
        <h2>You're in!</h2>
        <p className="text-muted" style={{ margin: 'var(--space-md) 0' }}>Waiting for the host to start the game...</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <h1 className="text-accent">{lobbyData.count}</h1>
          <p className="text-muted">Participants joined</p>
        </div>
      </div>
    </div>
  );
}
