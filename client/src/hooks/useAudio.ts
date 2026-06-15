import { useState } from 'react';

// Web Audio API context helper
let audioCtx: AudioContext | null = null;
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

export const useAudio = () => {
  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    const saved = localStorage.getItem('quizbee_muted');
    return saved === 'true';
  });

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem('quizbee_muted', String(muted));
  };

  const playTick = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (browser security autoplay policies)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Short tick click
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  const playChime = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    // Arpeggio / chime: C5 -> E5 -> G5
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.start();
    osc.stop(now + 0.4);
  };

  const playBuzz = () => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    // Downward sweep / low buzzer
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.25);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.start();
    osc.stop(now + 0.35);
  };

  return {
    isMuted,
    setIsMuted,
    playTick,
    playChime,
    playBuzz
  };
};
