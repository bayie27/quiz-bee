import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Podium() {
  const { podiumData, socket } = useSocket();
  const navigate = useNavigate();
  const [branding, setBranding] = useState({ primary_color_hex: '#8b5cf6', accent_color_hex: '#d946ef' });
  
  // Animation Sequence State
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch('/api/branding').then(res => res.json()).then(data => { if (data.id) setBranding(data); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!podiumData) navigate('/screen/lobby');
  }, [podiumData, navigate]);

  useEffect(() => {
    if (!socket) return;
    const onLeaderboardShow = () => navigate('/screen/leaderboard');
    socket.on('leaderboard:show', onLeaderboardShow);
    return () => socket.off('leaderboard:show', onLeaderboardShow);
  }, [socket, navigate]);

  // Sequence the animations
  useEffect(() => {
    if (!podiumData) return;
    
    const sequence = async () => {
      // Step 1: Reveal 5th and 4th (after 2s)
      await new Promise(r => setTimeout(r, 2000));
      setStep(1);
      
      // Step 2: Bronze (3rd) (after 3s)
      await new Promise(r => setTimeout(r, 3000));
      setStep(2);
      
      // Step 3: Silver (2nd) (after 2s)
      await new Promise(r => setTimeout(r, 2000));
      setStep(3);
      
      // Step 4: Gold (1st) (after 2.5s)
      await new Promise(r => setTimeout(r, 2500));
      setStep(4);
    };

    sequence();
  }, [podiumData]);

  if (!podiumData) return <div style={{ background: '#0f172a', height: '100vh' }}></div>;

  const first = podiumData.find(p => p.rank === 1);
  const second = podiumData.find(p => p.rank === 2);
  const third = podiumData.find(p => p.rank === 3);
  const runnersUp = podiumData.filter(p => p.rank > 3).sort((a, b) => b.rank - a.rank); // 5th, then 4th

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      overflow: 'hidden'
    }}>
      <h1 style={{ fontSize: '4rem', textAlign: 'center', color: branding.primary_color_hex, marginBottom: '20px' }}>
        Final Results
      </h1>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '40px' }}>
        
        {/* Runners up (5th and 4th) */}
        <AnimatePresence>
          {step >= 1 && runnersUp.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: '20px', marginBottom: '60px' }}
            >
              {runnersUp.map(p => (
                <div key={p.rank} className="glass-card" style={{ padding: '15px 30px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: `4px solid ${branding.accent_color_hex}` }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{p.rank}th</span>
                  <span style={{ fontSize: '2rem' }}>{p.avatar || '😎'}</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{p.name}</span>
                  <span style={{ fontSize: '1.5rem', color: branding.accent_color_hex, marginLeft: '20px' }}>{p.score}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Podium */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '400px' }}>
          
          {/* 2nd Place (Silver) */}
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AnimatePresence>
              {step >= 3 && second && (
                <motion.div 
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', marginBottom: '20px' }}
                >
                  <div style={{ fontSize: '4rem' }}>{second.avatar || '🥈'}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{second.name}</div>
                  <div style={{ fontSize: '1.5rem', color: '#94a3b8' }}>{second.score} pts</div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: step >= 3 ? '250px' : 0 }}
              style={{ width: '100%', background: 'linear-gradient(to top, #475569, #94a3b8)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}
            >
              {step >= 3 && <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>2</span>}
            </motion.div>
          </div>

          {/* 1st Place (Gold) */}
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AnimatePresence>
              {step >= 4 && first && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}
                >
                  {/* Glow effect */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(0,0,0,0) 70%)', zIndex: -1 }}></div>
                  <div style={{ fontSize: '6rem' }}>{first.avatar || '👑'}</div>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fbbf24', textShadow: '0 2px 10px rgba(251,191,36,0.5)' }}>{first.name}</div>
                  <div style={{ fontSize: '2rem', color: '#fef3c7' }}>{first.score} pts</div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: step >= 4 ? '350px' : 0 }}
              style={{ width: '100%', background: 'linear-gradient(to top, #b45309, #fbbf24)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '20px', boxShadow: '0 -10px 40px rgba(251,191,36,0.3)' }}
            >
              {step >= 4 && <span style={{ fontSize: '5rem', fontWeight: 'bold', color: 'white', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>1</span>}
            </motion.div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div style={{ width: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AnimatePresence>
              {step >= 2 && third && (
                <motion.div 
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: 'center', marginBottom: '20px' }}
                >
                  <div style={{ fontSize: '4rem' }}>{third.avatar || '🥉'}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{third.name}</div>
                  <div style={{ fontSize: '1.5rem', color: '#b45309' }}>{third.score} pts</div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: step >= 2 ? '180px' : 0 }}
              style={{ width: '100%', background: 'linear-gradient(to top, #78350f, #b45309)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}
            >
              {step >= 2 && <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>3</span>}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
