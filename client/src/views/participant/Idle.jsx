import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Idle() {
  const { currentQuestion, isGameEnded } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentQuestion) navigate('/question');
    if (isGameEnded) navigate('/end');
  }, [currentQuestion, isGameEnded, navigate]);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, alignItems: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
      <div className="glass-card animate-pulse text-center" style={{ width: '100%' }}>
        <h2>Get Ready!</h2>
        <p className="text-muted" style={{ marginTop: 'var(--space-md)' }}>Look at the big screen.</p>
      </div>
    </div>
  );
}
