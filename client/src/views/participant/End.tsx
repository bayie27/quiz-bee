import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import html2canvas from 'html2canvas';
import AvatarBadge from '../../components/AvatarBadge';

export default function End() {
  const { resultCard, socket } = useSocket();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!socket) return;
    const onRoomReset = () => navigate('/join', { replace: true });
    socket.on('room:reset', onRoomReset);
    return () => { socket.off('room:reset', onRoomReset); };
  }, [socket, navigate]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setDownloadError('');
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: '#f0f0f0' });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Canvas export failed');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = String(resultCard?.name || 'player').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
      link.download = 'jpcs-result-' + safeName + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('Failed to generate result card', err);
      setDownloadError('Failed to generate image. Please try again.');
    }
    setIsGenerating(false);
  };

  if (!resultCard) return <main className="bau-mobile-screen bau-center"><p className="text-muted text-center">Waiting for final results.</p></main>;

  return (
    <main className="bau-mobile-screen">
      <div className="bau-stack text-center">
        <h1 className="bau-title-md">Game Over</h1>
        <p className="bau-meta">Your final result card is ready.</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <section ref={cardRef} className="bau-card blue bau-stack text-center" style={{ width: '100%', maxWidth: 320, aspectRatio: '9 / 16', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div className="brand-lockup" style={{ justifyContent: 'center' }}>
            <span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span>
            <span>JPCS Quiz Game</span>
          </div>
          <div className="bau-stack" style={{ alignItems: 'center' }}>
            <div className="result-avatar-frame"><AvatarBadge avatar={resultCard.avatar} size={76} /></div>
            <div><h2 className="bau-title-md">{resultCard.name}</h2><p>{resultCard.section}</p></div>
          </div>
          <div className="bau-grid two">
            <div className="stat-block" style={{ background: '#fff', color: '#121212' }}>
              <div className="bau-meta">Final Rank</div>
              <strong className="stat-value" style={{ fontSize: '2rem' }}>#{resultCard.rank ?? '-'}</strong>
            </div>
            <div className="stat-block" style={{ background: '#fff', color: '#121212' }}>
              <div className="bau-meta">Final Score</div>
              <strong className="stat-value" style={{ fontSize: '2rem' }}>{resultCard.score ?? 0}</strong>
            </div>
          </div>
          <div className="bau-card yellow compact no-shadow"><strong>Best Streak: {resultCard.bestStreak}</strong></div>
        </section>
      </div>
      {downloadError && <p className="bau-error" role="alert">{downloadError}</p>}
      <button onClick={handleDownload} disabled={isGenerating} className="bau-button primary full" type="button">{isGenerating ? 'Generating' : 'Save Result Card'}</button>
      <p className="bau-meta text-center">Save to your camera roll to share.</p>
    </main>
  );
}
