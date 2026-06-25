import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Leaderboard() {
  const { leaderboardData, revealData, isGameEnded, participant, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (isGameEnded) navigate('/end'); }, [isGameEnded, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onQuestionLive = () => navigate('/question');
    socket.on('question:live', onQuestionLive);
    return () => { socket.off('question:live', onQuestionLive); };
  }, [socket, navigate]);

  if (!leaderboardData) return null;
  const myData = revealData || participant;

  return (
    <main className="bau-mobile-screen">
      <h1 className="bau-title-md text-center">Leaderboard</h1>
      <section className="bau-stack bau-scroll" style={{ flex: 1 }}>
        {leaderboardData.map((p: any, idx: number) => (
          <div key={idx} className="bau-card compact animate-fade-in-up" style={{ background: p.name === participant?.name ? 'var(--color-yellow)' : 'var(--color-surface)' }}>
            <div className="bau-row">
              <strong style={{ width: 32 }}>#{p.rank}</strong>
              <span style={{ fontSize: '1.6rem' }}>{p.avatar || '😎'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}{p.name === participant?.name ? ' (You)' : ''}</div>
              </div>
              <strong>{p.score}</strong>
            </div>
          </div>
        ))}
      </section>
      {myData && !leaderboardData.find((p: any) => p.name === participant?.name) && (
        <section className="bau-card blue compact">
          <div className="bau-row between"><span>Your rank</span><strong>#{myData.rank || '-'}</strong></div>
          <div className="bau-row between"><span>Your score</span><strong>{myData.totalScore || myData.score || 0}</strong></div>
        </section>
      )}
    </main>
  );
}
