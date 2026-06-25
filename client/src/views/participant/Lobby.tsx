import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Lobby() {
  const { lobbyData, currentQuestion, isGameEnded, socket } = useSocket();
  const navigate = useNavigate();
  useEffect(() => {
    if (currentQuestion) navigate('/question');
    if (isGameEnded) navigate('/end');
    const onGameStarted = () => navigate('/idle');
    socket?.on('game:started', onGameStarted);
    return () => { socket?.off('game:started', onGameStarted); };
  }, [currentQuestion, isGameEnded, socket, navigate]);
  return (
    <main className="bau-mobile-screen bau-center">
      <section className="bau-card yellow animate-fade-in text-center bau-stack">
        <h1 className="bau-title-lg">You're In</h1>
        <p className="bau-kicker">Waiting for the host to start.</p>
        <div className="stat-block" style={{ background: '#fff' }}>
          <div className="stat-value">{lobbyData.count}</div>
          <div className="bau-meta">Participants joined</div>
        </div>
      </section>
    </main>
  );
}
