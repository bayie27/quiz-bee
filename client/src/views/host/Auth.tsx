import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Auth() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { socket, isHostAuthenticated, isConnected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (isHostAuthenticated) {
      navigate('/host');
    }
  }, [isHostAuthenticated, navigate]);

  useEffect(() => {
    if (!socket) return;
    
    const onAuthError = ({ reason }: { reason: string }) => {
      setError(reason);
    };

    socket.on('host:auth_error', onAuthError);

    return () => {
      socket.off('host:auth_error', onAuthError);
    };
  }, [socket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !socket) {
      setError('Not connected to server.');
      return;
    }
    setError('');
    socket.emit('host:auth', { pin });
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="glass-card animate-fade-in-up" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="text-center" style={{ marginBottom: 'var(--space-md)' }}>Host Login</h1>
        <p className="text-muted text-center" style={{ marginBottom: 'var(--space-lg)' }}>Enter the host PIN to access the dashboard.</p>
        
        {error && <p className="text-danger text-center" style={{ marginBottom: 'var(--space-md)' }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <input
            type="password"
            placeholder="Host PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Login</button>
        </form>
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
  cursor: 'pointer'
};
