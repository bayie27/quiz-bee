import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenLeaderboard() {
  const { leaderboardData, socket, isGameEnded } = useSocket();
  const navigate = useNavigate();
  const [branding, setBranding] = useState({ primary_color_hex: '#8b5cf6', accent_color_hex: '#d946ef' });

  useEffect(() => {
    fetch('/api/branding').then(res => res.json()).then(data => { if (data.id) setBranding(data); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (isGameEnded && !leaderboardData) navigate('/screen/podium');
  }, [isGameEnded, leaderboardData, navigate]);

  useEffect(() => {
    if (!socket) return;
    const onQuestionPreview = () => navigate('/screen/reveal'); // host advanced
    const onQuestionLive = () => navigate('/screen/question');
    
    socket.on('question:preview', onQuestionPreview);
    socket.on('question:live', onQuestionLive);
    
    return () => {
      socket.off('question:preview', onQuestionPreview);
      socket.off('question:live', onQuestionLive);
    };
  }, [socket, navigate]);

  if (!leaderboardData) return <div style={{ background: '#0f172a', height: '100vh' }}></div>;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 80px'
    }}>
      <h1 style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '40px', color: branding.primary_color_hex }}>
        Top Participants
      </h1>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        flex: 1,
        overflow: 'hidden'
      }}>
        {leaderboardData.map((p, idx) => (
          <div key={idx} className="glass-card animate-fade-in-up" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '20px 40px',
            gap: '30px',
            animationDelay: `${idx * 0.1}s`,
            borderLeft: `8px solid ${idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : branding.primary_color_hex}`
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', width: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {p.rank}
            </div>
            <div style={{ fontSize: '4rem', width: '80px', textAlign: 'center' }}>
              {p.avatar || '😎'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{p.name}</div>
              <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>{p.section}</div>
            </div>
            {p.bestStreak > 2 && (
              <div style={{ fontSize: '2rem', color: 'var(--color-warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                🔥 {p.bestStreak}
              </div>
            )}
            <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: branding.accent_color_hex, width: '250px', textAlign: 'right' }}>
              {p.score} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
