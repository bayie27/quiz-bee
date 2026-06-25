import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenLobby() {
  const { isScreenRegistered, lobbyData, socket } = useSocket();
  const navigate = useNavigate();

  // Register screen once socket is ready
  useEffect(() => {
    if (socket) {
      socket.emit('screen:register');
    }
  }, [socket]);

  // Listen for game start
  useEffect(() => {
    if (!socket) return;
    const onGameStarted = () => navigate('/screen/question');
    socket.on('game:started', onGameStarted);
    return () => {
      socket.off('game:started', onGameStarted);
    };
  }, [socket, navigate]);

  const joinUrl = `${window.location.protocol}//${window.location.host}/join`;

  if (!isScreenRegistered) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'black', color: 'white' }}>Connecting...</div>;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: 0 }}>JPCS Quiz Game</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '2rem', color: '#d946ef', margin: 0 }}>Join at {joinUrl}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '60px', flex: 1 }}>
        
        {/* Left Column: QR and PIN */}
        <div style={{ width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <QRCodeSVG value={joinUrl} size={360} level="H" />
          </div>
          
          <div className="glass-card" style={{ width: '100%', textAlign: 'center', padding: '30px' }}>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Room PIN</div>
            <div style={{ fontSize: '6rem', fontWeight: 'bold', letterSpacing: '8px', color: '#8b5cf6' }}>
              {lobbyData?.roomPin || '------'}
            </div>
          </div>
        </div>

        {/* Right Column: Participants Grid */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>Participants</h2>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', background: '#8b5cf6', padding: '10px 30px', borderRadius: '40px' }}>
              {lobbyData?.count || 0}
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '20px', 
            overflowY: 'auto', 
            alignContent: 'start',
            flex: 1
          }}>
            {(lobbyData?.participants || []).map((p: any, idx: number) => (
              <div key={idx} className="animate-fade-in-up" style={{ 
                background: 'rgba(255,255,255,0.1)', 
                padding: '15px 20px', 
                borderRadius: '12px',
                borderLeft: `4px solid #8b5cf6`,
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{p.avatar || '😎'}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              </div>
            ))}
            {lobbyData?.count === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.5rem', marginTop: '40px' }}>
                Waiting for players to join...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

