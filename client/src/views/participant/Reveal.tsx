import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Reveal() {
  const { revealData, currentQuestion, isGameEnded, leaderboardData, playChime, playBuzz } = useSocket();
  const navigate = useNavigate();
  const playedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!revealData && currentQuestion) navigate('/question');
    if (leaderboardData) navigate('/leaderboard');
    if (isGameEnded) navigate('/end');
  }, [revealData, currentQuestion, isGameEnded, leaderboardData, navigate]);

  useEffect(() => {
    if (revealData && currentQuestion && playedRef.current !== currentQuestion.questionId) {
      playedRef.current = currentQuestion.questionId;
      if (revealData.isCorrect === true) playChime(); else playBuzz();
    }
  }, [revealData, currentQuestion, playChime, playBuzz]);

  if (!revealData) return null;

  const { isCorrect, answered, points, breakdown, totalScore, rank, streak } = revealData;
  const message = answered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Time Up';
  const toneClass = isCorrect ? 'yellow' : answered ? 'red' : 'muted';

  return (
    <main className="bau-mobile-screen bau-center">
      <section className={'bau-card animate-fade-in-up bau-stack text-center ' + toneClass}>
        <div className="bau-kicker">Result</div>
        <h1 className="bau-title-lg">{message}</h1>
        <div className="stat-block" style={{ background: '#fff' }}>
          <div className="stat-value">+{points || 0}</div>
          <div className="bau-meta">Points</div>
        </div>
        {breakdown && (
          <div className="bau-card compact no-shadow" style={{ textAlign: 'left' }}>
            <div className="bau-row between"><span>Base</span><strong>{breakdown.base}</strong></div>
            <div className="bau-row between"><span>Speed</span><strong>+{breakdown.speedBonus}</strong></div>
            <div className="bau-row between"><span>Multiplier</span><strong>x{breakdown.multiplier}</strong></div>
          </div>
        )}
        <div className="bau-grid two">
          <div className="stat-block"><div className="bau-meta">Total</div><strong>{totalScore || 0}</strong></div>
          <div className="stat-block"><div className="bau-meta">Rank</div><strong>#{rank || '-'}</strong></div>
        </div>
        {streak > 1 && <p className="bau-kicker">{streak} answer streak</p>}
      </section>
    </main>
  );
}
