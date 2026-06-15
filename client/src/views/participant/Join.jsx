import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Join() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const { socket, isConnected, setParticipant } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const onJoinSuccess = (data) => {
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

    const onJoinError = ({ reason }) => {
      setError(reason);
    };

    socket.on('join:success', onJoinSuccess);
    socket.on('join:error', onJoinError);

    return () => {
      socket.off('join:success', onJoinSuccess);
      socket.off('join:error', onJoinError);
    };
  }, [socket, navigate, setParticipant]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!isConnected) {
      setError('Not connected to server.');
      return;
    }

    socket.emit('participant:join', { pin, name, section });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: 'var(--space-xl) var(--space-md)' }}>
      <div className="glass-card animate-fade-in-up">
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
          <button type="submit" style={{ ...buttonStyle, opacity: isConnected ? 1 : 0.5 }} disabled={!isConnected}>
            {isConnected ? 'Join' : 'Connecting...'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(0, 0, 0, 0.2)',
  color: 'white',
  fontSize: '1rem',
  outline: 'none'
};

const buttonStyle = {
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-primary)',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  marginTop: 'var(--space-sm)'
};
