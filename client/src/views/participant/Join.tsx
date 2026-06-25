import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

const AVATARS = ['😎', '🤠', '👻', '👾', '🦊', '🐼', '🚀', '🧠'];

export default function Join() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [error, setError] = useState('');
  const [isRejoining, setIsRejoining] = useState(false);
  const { socket, isConnected, setParticipant } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;
    const onJoinSuccess = (data: any) => {
      setParticipant(data);
      navigate(data.restored && data.currentQuestion ? '/question' : '/lobby');
    };
    const onJoinError = ({ reason }: { reason: string }) => {
      setError(reason);
      setIsRejoining(false);
      localStorage.removeItem('quizbee_session');
    };
    socket.on('join:success', onJoinSuccess);
    socket.on('join:error', onJoinError);
    if (isConnected) {
      const savedSession = localStorage.getItem('quizbee_session');
      if (savedSession) {
        try {
          const { name, section, sessionToken } = JSON.parse(savedSession);
          if (name && section && sessionToken) {
            setIsRejoining(true);
            socket.emit('participant:rejoin', { name, section, sessionToken });
          }
        } catch {
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
    socket.emit('participant:join', { pin, name, section, avatar });
  };

  return (
    <main className="bau-mobile-screen bau-center">
      <section className="bau-card animate-fade-in-up">
        {isRejoining ? (
          <div className="bau-stack text-center" style={{ alignItems: 'center' }}>
            <div className="bau-card yellow compact no-shadow" style={{ width: 84, height: 84, display: 'grid', placeItems: 'center', fontSize: '2rem' }}>↻</div>
            <h1 className="bau-title-md">Restoring Session</h1>
            <p className="text-muted">Reconnecting to the game lobby.</p>
          </div>
        ) : (
          <div className="bau-stack">
            <div className="bau-stack text-center">
              <h1 className="bau-title-lg">Join Game</h1>
              <p className="bau-meta">Enter the room PIN and choose an avatar.</p>
            </div>
            {error && <p className="bau-error" role="alert">{error}</p>}
            <form className="bau-form" onSubmit={handleSubmit}>
              <label><span className="bau-label">Room PIN</span><input className="bau-input" inputMode="numeric" type="text" value={pin} onChange={(e) => setPin(e.target.value)} required /></label>
              <label><span className="bau-label">Display Name</span><input className="bau-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label><span className="bau-label">Section</span><input className="bau-input" type="text" placeholder="BSCS-3A" value={section} onChange={(e) => setSection(e.target.value)} required /></label>
              <div>
                <span className="bau-label">Avatar</span>
                <div className="avatar-grid">
                  {AVATARS.map((emoji) => (
                    <button key={emoji} type="button" className={'avatar-button ' + (avatar === emoji ? 'selected' : '')} onClick={() => setAvatar(emoji)} aria-label={'Use avatar ' + emoji}>{emoji}</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="bau-button primary full" disabled={!isConnected}>{isConnected ? 'Join' : 'Connecting'}</button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
