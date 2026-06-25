import { useEffect } from 'react';
import AvatarBadge from '../../components/AvatarBadge';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenLeaderboard() {
  const { leaderboardData, socket, isGameEnded } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (isGameEnded && !leaderboardData) navigate('/screen/podium'); }, [isGameEnded, leaderboardData, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onQuestionPreview = () => navigate('/screen/reveal');
    const onQuestionLive = () => navigate('/screen/question');
    socket.on('question:preview', onQuestionPreview);
    socket.on('question:live', onQuestionLive);
    return () => { socket.off('question:preview', onQuestionPreview); socket.off('question:live', onQuestionLive); };
  }, [socket, navigate]);

  if (!leaderboardData) return <main className="screen-shell" />;

  return (
    <main className="screen-shell">
      <header className="screen-header"><h1 className="screen-title">Top Participants</h1><div className="screen-meta">Live Rank</div></header>
      <section className="bau-stack" style={{ flex: 1, overflow: 'hidden' }}>
        {leaderboardData.map((p: any, idx: number) => (
          <div key={idx} className="rank-row animate-fade-in-up">
            <strong style={{ fontSize: '2.6rem' }}>#{p.rank}</strong>
            <AvatarBadge avatar={p.avatar} size={44} />
            <div style={{ minWidth: 0 }}><h2 className="bau-title-md" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h2><p className="screen-meta" style={{ fontSize: '1.2rem' }}>{p.section}</p></div>
            <strong style={{ fontSize: '2.8rem', textAlign: 'right' }}>{p.score} pts</strong>
          </div>
        ))}
      </section>
    </main>
  );
}
