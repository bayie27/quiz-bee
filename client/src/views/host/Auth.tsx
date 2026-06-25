import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Auth() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { socket, isHostAuthenticated, isConnected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (isHostAuthenticated) navigate('/host'); }, [isHostAuthenticated, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onAuthError = ({ reason }: { reason: string }) => setError(reason);
    socket.on('host:auth_error', onAuthError);
    return () => { socket.off('host:auth_error', onAuthError); };
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
    <main className="bau-page" style={{ display: 'grid', placeItems: 'center', padding: 'var(--space-xl)' }}>
      <section className="bau-card" style={{ width: 'min(420px, 100%)' }}>
        <form className="bau-form" onSubmit={handleSubmit}>
          <div className="bau-stack text-center">
            <h1 className="bau-title-lg">Host Login</h1>
            <p className="bau-meta">Enter the host PIN to access controls.</p>
          </div>
          {error && <p className="bau-error" role="alert">{error}</p>}
          <label><span className="bau-label">Host PIN</span><input className="bau-input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} required /></label>
          <button type="submit" className="bau-button primary full" disabled={!isConnected}>{isConnected ? 'Login' : 'Connecting'}</button>
        </form>
      </section>
    </main>
  );
}
