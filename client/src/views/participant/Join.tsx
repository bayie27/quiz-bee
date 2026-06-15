import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

const AVATARS = ['😎', '🤠', '👻', '👾', '🦊', '🐼', '🚀', '🧠'];
const ACCENT_COLORS = ['#6C63FF', '#FF6584', '#10B981', '#F59E0B', '#06B6D4', '#FF5722', '#EC4899', '#6366F1'];

export default function Join() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [accentColor, setAccentColor] = useState('#6C63FF');
  const [error, setError] = useState('');
  const { socket, isConnected, setParticipant } = useSocket();
  const navigate = useNavigate();

  const [isRejoining, setIsRejoining] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onJoinSuccess = (data: any) => {
      setParticipant(data);
      if (data.restored) {
        // Reconnected into an active session, check state
        if (data.currentQuestion) {
          navigate('/question');
        } else {
          navigate('/lobby');
        }
      } else {
        navigate('/lobby');
      }
    };

    const onJoinError = ({ reason }: { reason: string }) => {
      setError(reason);
      setIsRejoining(false);
      localStorage.removeItem('quizbee_session');
    };

    socket.on('join:success', onJoinSuccess);
    socket.on('join:error', onJoinError);

    // Auto-rejoin attempt if session exists in localStorage
    if (isConnected) {
      const savedSession = localStorage.getItem('quizbee_session');
      if (savedSession) {
        try {
          const { name, section, sessionToken } = JSON.parse(savedSession);
          if (name && section && sessionToken) {
            setIsRejoining(true);
            socket.emit('participant:rejoin', { name, section, sessionToken });
          }
        } catch (e) {
          localStorage.removeItem('quizbee_session');
        }
      }
    }

    return () => {
      socket.off('join:success', onJoinSuccess);
      socket.off('join:error', onJoinError);
    };
  }, [socket, isConnected, navigate, setParticipant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isConnected || !socket) {
      setError('Not connected to server.');
      return;
    }

    socket.emit('participant:join', { pin, name, section, avatar, accentColor });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: 'var(--space-md)' }}>
      <div className="glass-card animate-fade-in-up" style={{ margin: 'var(--space-md) 0' }}>
        {isRejoining ? (
          <div className="text-center animate-pulse" style={{ padding: 'var(--space-xl) 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔄</div>
            <h2>Restoring Session...</h2>
            <p className="text-muted" style={{ marginTop: 'var(--space-sm)' }}>Reconnecting to the game lobby...</p>
          </div>
        ) : (
          <>
            <h1 className="text-center" style={{ marginBottom: 'var(--space-md)' }}>Join Game</h1>
            {error && <p className="text-danger text-center" style={{ marginBottom: 'var(--space-md)' }}>{error}</p>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input
                type="number"
                placeholder="Room PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Section (e.g. BSCS-3A)"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                style={inputStyle}
              />

              {/* Avatar Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  Choose Avatar
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      style={{
                        fontSize: '1.75rem',
                        padding: 'var(--space-xs) 0',
                        borderRadius: 'var(--radius-md)',
                        background: avatar === emoji ? 'var(--color-primary-dark)' : 'rgba(255, 255, 255, 0.05)',
                        border: avatar === emoji ? '2px solid var(--color-primary-light)' : '2px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                  Choose Accent Color
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 'var(--space-xs)' }}>
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      style={{
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        background: color,
                        border: accentColor === color ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: accentColor === color ? `0 0 10px ${color}` : 'none',
                        cursor: 'pointer',
                        transform: accentColor === color ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all var(--transition-fast)'
                      }}
                      aria-label={`Accent color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" style={{ ...buttonStyle, opacity: isConnected ? 1 : 0.5 }} disabled={!isConnected}>
                {isConnected ? 'Join' : 'Connecting...'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(0, 0, 0, 0.2)',
  color: 'white',
  fontSize: '1rem',
  outline: 'none'
};

const buttonStyle: React.CSSProperties = {
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-primary)',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  marginTop: 'var(--space-sm)'
};
