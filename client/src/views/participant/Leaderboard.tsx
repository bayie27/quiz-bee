import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Leaderboard() {
  const { leaderboardData, revealData, isGameEnded, participant, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (isGameEnded) navigate('/end');
  }, [isGameEnded, navigate]);

  useEffect(() => {
    if (!socket) return;
    const onQuestionLive = () => navigate('/question');
    socket.on('question:live', onQuestionLive);
    return () => {
      socket.off('question:live', onQuestionLive);
    };
  }, [socket, navigate]);

  if (!leaderboardData) return null;

  const myData = revealData || participant; // revealData has the latest score, or fallback to participant

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 'var(--space-md)' }}>
      <h2 className="text-center text-primary" style={{ marginBottom: 'var(--space-md)' }}>Leaderboard</h2>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {leaderboardData.map((p: any, idx: number) => (
          <div key={idx} className="glass-card animate-fade-in-up" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: 'var(--space-sm) var(--space-md)',
            gap: 'var(--space-sm)',
            animationDelay: `${idx * 0.1}s`,
            borderLeft: `4px solid ${idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.2)'}`,
            background: p.name === participant?.name ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-card)'
          }}>
            <div style={{ fontWeight: 'bold', width: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {p.rank}
            </div>
            <div style={{ fontSize: '1.5rem' }}>
              {p.avatar || '😎'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <div style={{ fontWeight: 'bold' }}>{p.name} {p.name === participant?.name && '(You)'}</div>
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {p.score}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar for my score if I'm not in the top N */}
      {myData && !leaderboardData.find((p: any) => p.name === participant?.name) && (
        <div className="glass-card" style={{ marginTop: 'var(--space-md)', border: '1px solid var(--color-primary)' }}>
          <div className="text-muted text-center" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Your Rank</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>#{myData.rank || '-'}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{myData.totalScore || myData.score || 0} pts</div>
          </div>
        </div>
      )}
    </div>
  );
}
