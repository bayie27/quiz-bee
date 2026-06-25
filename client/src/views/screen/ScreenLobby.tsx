import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import AvatarBadge from '../../components/AvatarBadge';

export default function ScreenLobby() {
  const { isScreenRegistered, lobbyData, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (socket) socket.emit('screen:register'); }, [socket]);
  useEffect(() => {
    if (!socket) return;
    const onGameStarted = () => navigate('/screen/question');
    socket.on('game:started', onGameStarted);
    return () => { socket.off('game:started', onGameStarted); };
  }, [socket, navigate]);

  const joinUrl = (import.meta.env.VITE_PUBLIC_JOIN_URL as string) || 'https://quizbee-frontend-soky.onrender.com/join';
  if (!isScreenRegistered) return <div className="screen-shell"><div className="bau-card">Connecting screen...</div></div>;

  return (
    <main className="screen-shell">
      <header className="screen-header">
        <div className="brand-lockup" style={{ fontSize: '2rem' }}><span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span><span>JPCS Quiz Game</span></div>
        <div className="screen-meta" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.8rem)', maxWidth: 760, textAlign: 'right', overflowWrap: 'anywhere' }}>Join at {joinUrl}</div>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: '420px minmax(0, 1fr)', gap: 'var(--space-3xl)', flex: 1, minHeight: 0 }}>
        <div className="bau-stack" style={{ alignItems: 'center' }}>
          <div className="qr-frame"><QRCodeSVG value={joinUrl} size={360} level="H" /></div>
          <div className="bau-card yellow text-center" style={{ width: '100%' }}><div className="bau-kicker">Room PIN</div><div style={{ fontSize: 'clamp(3.6rem, 4.8vw, 5rem)', fontWeight: 900, letterSpacing: 4, lineHeight: 1, whiteSpace: 'nowrap' }}>{lobbyData?.roomPin || '------'}</div></div>
        </div>
        <div className="bau-card bau-stack" style={{ minHeight: 0 }}>
          <div className="bau-row between"><h1 className="bau-title-lg">Participants</h1><div className="bau-card red compact no-shadow" style={{ fontSize: '2.5rem', fontWeight: 900 }}>{lobbyData?.count || 0}</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)', overflow: 'auto', alignContent: 'start' }}>
            {(lobbyData?.participants || []).map((p: any, idx: number) => (
              <div key={idx} className="participant-tile animate-fade-in-up"><span style={{ fontSize: '1.8rem' }}>{p.avatar || '😎'}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span></div>
            ))}
            {lobbyData?.count === 0 && <p className="screen-meta" style={{ gridColumn: '1 / -1', marginTop: 'var(--space-xl)' }}>Waiting for players to join.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
