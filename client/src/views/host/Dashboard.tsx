import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { apiPath } from '../../config/api';

export default function Dashboard() {
  const { isHostAuthenticated, hostState, socket, hostAnswerCount, hostPreview, timer, isGameEnded } = useSocket();
  const navigate = useNavigate();
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState('');

  useEffect(() => {
    if (!isHostAuthenticated) {
      navigate('/host/login');
    } else {
      fetch(apiPath('/api/question-sets'))
        .then(res => res.json())
        .then(data => setQuestionSets(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [isHostAuthenticated, navigate]);

  if (!isHostAuthenticated) return null;

  const handleStartGame = () => {
    if (!selectedSet) return alert('Select a question set');
    if (socket) socket.emit('host:start_game', { questionSetId: selectedSet });
  };

  const handleLaunch = () => socket?.emit('host:launch_question');
  const handlePause = () => socket?.emit('host:pause_timer');
  const handleResume = () => socket?.emit('host:resume_timer');
  const handleReveal = () => socket?.emit('host:reveal_answer');
  const handleSkip = () => socket?.emit('host:skip_question');
  const handleLeaderboard = () => socket?.emit('host:show_leaderboard');
  const handleEndGame = () => socket?.emit('host:end_game');
  const handleReset = () => socket?.emit('host:reset_room');

  const isActiveGame = hostState?.status === 'active';
  const gameEnded = isGameEnded || hostState?.status === 'ended';
  const showGameControls = isActiveGame || gameEnded;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md) var(--space-xl)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2>JPCS Quiz Game Host</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Link to="/host/editor" style={navLink}>Editor</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: 'var(--space-xl) var(--space-md)', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>
          
          {/* Main Panel */}
          <div>
            {!showGameControls ? (
              <div className="glass-card">
                <h2>Start New Game</h2>
                <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)' }}>
                  <select 
                    value={selectedSet} 
                    onChange={e => setSelectedSet(e.target.value)}
                    style={{ flex: 1, padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <option value="">-- Select Question Set --</option>
                    {questionSets.map(s => <option key={s.id} value={s.id}>{s.name || s.title}</option>)}
                  </select>
                  <button onClick={handleStartGame} style={primaryBtn} disabled={!selectedSet}>Start Game</button>
                </div>
              </div>
            ) : (
              <div className="glass-card">
                <h2>Game Controls</h2>
                {hostPreview ? (
                  <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted">Up Next: Q{hostPreview.questionNumber} / {hostPreview.totalQuestions}</div>
                    <h3 style={{ margin: 'var(--space-sm) 0' }}>{hostPreview.question}</h3>
                    <div className="text-success" style={{ fontWeight: 'bold' }}>Answer: {hostPreview.answer}</div>
                    
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                      <button onClick={handleLaunch} style={primaryBtn}>Launch Question</button>
                      <button onClick={handleSkip} style={dangerBtn}>Skip</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    {gameEnded ? (
                      <div>
                        <h3>Game Ended</h3>
                        <button onClick={handleReset} style={primaryBtn}>Reset Room</button>
                      </div>
                    ) : (
                      <div className="text-muted">Waiting for next phase...</div>
                    )}
                  </div>
                )}

                {/* Active Question Panel */}
                {timer.remaining > 0 && !hostPreview && (
                  <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Live Question</h3>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timer.remaining <= 5 ? 'var(--color-danger)' : 'white' }}>{timer.remaining}s</div>
                    </div>
                    
                    <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
                      {timer.paused ? 
                        <button onClick={handleResume} style={primaryBtn}>Resume Timer</button> :
                        <button onClick={handlePause} style={secondaryBtn}>Pause Timer</button>
                      }
                      <button onClick={handleReveal} style={primaryBtn}>Reveal Answer</button>
                    </div>
                  </div>
                )}
                
                {/* Reveal & Leaderboard Controls */}
                {timer.remaining === 0 && !hostPreview && !gameEnded && (
                  <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
                    <button onClick={handleReveal} style={primaryBtn}>Reveal Answer</button>
                    <button onClick={handleLeaderboard} style={secondaryBtn}>Show Leaderboard</button>
                    <button onClick={handleEndGame} style={dangerBtn}>End Game</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="glass-card text-center">
              <div className="text-muted">Room PIN</div>
              <h1 className="text-primary" style={{ letterSpacing: '4px', fontSize: '3rem' }}>{hostState?.roomPin || '------'}</h1>
            </div>

            <div className="glass-card" style={{ marginTop: 'var(--space-md)' }}>
              <h3>Live Status</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
                <span>Participants</span>
                <span style={{ fontWeight: 'bold' }}>{hostState?.participantCount || 0}</span>
              </div>
              
              {isActiveGame && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <h4>All Answers In</h4>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', height: '24px', marginTop: '8px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ 
                      width: `${hostAnswerCount.percentage || 0}%`, 
                      background: 'var(--color-success)', 
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }}></div>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {hostAnswerCount.answered} / {hostAnswerCount.total} ({hostAnswerCount.percentage || 0}%)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

const navLink: React.CSSProperties = { color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', padding: '0 var(--space-sm)' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary)', color: 'white', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const secondaryBtn: React.CSSProperties = { background: 'var(--bg-secondary)', color: 'white', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontWeight: 'bold' };
const dangerBtn: React.CSSProperties = { background: 'var(--color-danger)', color: 'white', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
