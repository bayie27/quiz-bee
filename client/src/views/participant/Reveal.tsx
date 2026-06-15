import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Reveal() {
  const { revealData, currentQuestion, isGameEnded, leaderboardData } = useSocket();
  const navigate = useNavigate();

  // If new question starts, go to question
  useEffect(() => {
    // If revealData is null, it means a new question started
    if (!revealData) {
      if (currentQuestion) navigate('/question');
    }
    if (leaderboardData) navigate('/leaderboard');
    if (isGameEnded) navigate('/end');
  }, [revealData, currentQuestion, isGameEnded, leaderboardData, navigate]);

  if (!revealData) return null;

  const { isCorrect, answered, points, breakdown, totalScore, rank, streak } = revealData;

  const icon = answered ? (isCorrect ? '✅' : '❌') : '⏱️';
  const message = answered ? (isCorrect ? 'Correct!' : 'Incorrect!') : 'Time\'s Up!';

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 'var(--space-md)', paddingBottom: 'var(--space-xl)' }}>
      <div className={`glass-card animate-fade-in-up`} style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', textAlign: 'center',
        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : (answered ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-glass)'),
        borderColor: isCorrect ? 'var(--color-success)' : (answered ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)')
      }}>
        
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>{icon}</div>
        <h1 style={{ color: isCorrect ? 'var(--color-success)' : (answered ? 'var(--color-danger)' : 'var(--text-muted)') }}>
          {message}
        </h1>
        
        <div style={{ margin: 'var(--space-xl) 0', width: '100%' }}>
          <h2 className={isCorrect ? 'text-success' : 'text-muted'}>+{points || 0} pts</h2>
          
          {breakdown && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-md)', textAlign: 'left', fontSize: '0.9rem' }}>
              <div style={flexRow}><span>Base Points:</span> <span>{breakdown.base}</span></div>
              <div style={flexRow}><span>Speed Bonus:</span> <span>+{breakdown.speedBonus}</span></div>
              <div style={{ ...flexRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <span>Multiplier:</span> <span className="text-warning">x{breakdown.multiplier}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', width: '100%', justifyContent: 'center' }}>
          <div style={statBox}>
            <div style={{ fontSize: '0.8rem' }} className="text-muted">Total Score</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{totalScore || 0}</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: '0.8rem' }} className="text-muted">Rank</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>#{rank || '-'}</div>
          </div>
        </div>

        {streak > 1 && (
          <div className="animate-bounce" style={{ marginTop: 'var(--space-xl)', color: 'var(--color-warning)', fontWeight: 'bold', fontSize: '1.2rem' }}>
            🔥 {streak} Streak!
          </div>
        )}
      </div>
    </div>
  );
}

const flexRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' };
const statBox: React.CSSProperties = { background: 'rgba(0,0,0,0.3)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', flex: 1 };
