import { useEffect, useState } from 'react';
import AvatarBadge from '../../components/AvatarBadge';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function Podium() {
  const { podiumData, socket } = useSocket();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => { if (!podiumData) navigate('/screen/lobby'); }, [podiumData, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onLeaderboardShow = () => navigate('/screen/leaderboard');
    socket.on('leaderboard:show', onLeaderboardShow);
    return () => { socket.off('leaderboard:show', onLeaderboardShow); };
  }, [socket, navigate]);
  useEffect(() => {
    if (!podiumData) return;
    setStep(0);
    const timers = [setTimeout(() => setStep(1), 600), setTimeout(() => setStep(2), 1300), setTimeout(() => setStep(3), 2000), setTimeout(() => setStep(4), 2700)];
    return () => timers.forEach(clearTimeout);
  }, [podiumData]);

  if (!podiumData) return <main className="screen-shell" />;
  const first = podiumData.find((p: any) => p.rank === 1);
  const second = podiumData.find((p: any) => p.rank === 2);
  const third = podiumData.find((p: any) => p.rank === 3);
  const runnersUp = podiumData.filter((p: any) => p.rank > 3).sort((a: any, b: any) => a.rank - b.rank);

  const Player = ({ player }: { player: any }) => player ? <div className="bau-card compact text-center no-shadow"><AvatarBadge avatar={player.avatar} size={72} /><h2 className="bau-title-md">{player.name}</h2><p className="screen-meta">{player.score} pts</p></div> : null;

  return (
    <main className="screen-shell">
      <header className="screen-header">
        <h1 className="screen-title">Final Results</h1>
        <div className="brand-lockup screen-brand">
          <span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span>
          <span>JPCS Quiz Game</span>
        </div>
      </header>
      <AnimatePresence>
        {step >= 1 && runnersUp.length > 0 && <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bau-row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>{runnersUp.map((p: any) => <div key={p.rank} className="bau-card compact"><strong>#{p.rank}</strong> <AvatarBadge avatar={p.avatar} size={28} /> {p.name} <strong>{p.score}</strong></div>)}</motion.section>}
      </AnimatePresence>
      <section className="podium">
        <motion.div className="podium-place podium-second" initial={{ opacity: 0, y: 80 }} animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 80 }}><Player player={second} /><div className="podium-block">2</div></motion.div>
        <motion.div className="podium-place podium-first" initial={{ opacity: 0, y: 80 }} animate={{ opacity: step >= 4 ? 1 : 0, y: step >= 4 ? 0 : 80 }}><Player player={first} /><div className="podium-block">1</div></motion.div>
        <motion.div className="podium-place podium-third" initial={{ opacity: 0, y: 80 }} animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 80 }}><Player player={third} /><div className="podium-block">3</div></motion.div>
      </section>
    </main>
  );
}
