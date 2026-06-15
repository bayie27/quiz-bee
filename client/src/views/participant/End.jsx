import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import html2canvas from 'html2canvas';
import { apiPath } from '../../config/api';

export default function End() {
  const { resultCard, socket } = useSocket();
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [branding, setBranding] = useState({ event_name: 'Quiz Bee', primary_color_hex: '#8b5cf6', accent_color_hex: '#d946ef', logo_url: '' });

  useEffect(() => {
    fetch(apiPath('/api/branding')).then(res => res.json()).then(data => { if (data.id) setBranding(data); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onRoomReset = () => navigate('/join', { replace: true });
    socket.on('room:reset', onRoomReset);
    return () => socket.off('room:reset', onRoomReset);
  }, [socket, navigate]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      const dataUrl = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `quizbee-result-${resultCard?.name || 'player'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate result card', err);
      alert('Failed to generate image. Please try again.');
    }
    setIsGenerating(false);
  };

  if (!resultCard) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <p className="text-muted">Waiting for final results...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 'var(--space-md)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
        <h1>Game Over!</h1>
        <p className="text-muted">Check out your final result card below.</p>
      </div>

      {/* The Result Card (9:16 aspect ratio) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
        <div 
          ref={cardRef}
          style={{
            width: '100%',
            maxWidth: '320px',
            aspectRatio: '9/16', // Instagram Story format
            background: `linear-gradient(135deg, ${branding.primary_color_hex}, ${branding.accent_color_hex})`,
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative background circle */}
          <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '150%', height: '50%', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', zIndex: 0 }}></div>

          <div style={{ zIndex: 1, textAlign: 'center', width: '100%' }}>
            {branding.logo_url && <img src={branding.logo_url} alt="Logo" crossOrigin="anonymous" style={{ height: '40px', objectFit: 'contain', marginBottom: '10px' }} />}
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.9 }}>
              {branding.event_name}
            </div>
          </div>

          <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ 
              width: '100px', height: '100px', 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '3.5rem', 
              border: `4px solid ${resultCard.accentColor || 'white'}`,
              marginBottom: '16px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }}>
              {resultCard.avatar || '😎'}
            </div>
            
            <h2 style={{ fontSize: '1.8rem', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{resultCard.name}</h2>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>{resultCard.section}</div>
          </div>

          <div style={{ zIndex: 1, width: '100%', display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase' }}>Rank</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>#{resultCard.rank}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase' }}>Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{resultCard.score}</div>
            </div>
          </div>

          <div style={{ zIndex: 1, background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(10px)' }}>
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <span style={{ fontWeight: 'bold' }}>Best Streak: {resultCard.bestStreak}</span>
          </div>

        </div>
      </div>

      <button 
        onClick={handleDownload} 
        disabled={isGenerating}
        style={{
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 10px rgba(139, 92, 246, 0.4)'
        }}
      >
        {isGenerating ? 'Generating...' : '📸 Save Result Card'}
      </button>
      
      <p className="text-muted text-center" style={{ fontSize: '0.9rem', marginTop: 'var(--space-sm)' }}>
        Save to your camera roll to share on Instagram Stories!
      </p>

    </div>
  );
}
