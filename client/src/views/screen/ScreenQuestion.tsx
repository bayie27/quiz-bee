import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenQuestion() {
  const { currentQuestion, skippedQuestion, revealData, isGameEnded, timer, gameCountdown } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (revealData) navigate('/screen/reveal'); if (isGameEnded) navigate('/screen/podium'); }, [revealData, isGameEnded, navigate]);
  if (!currentQuestion && gameCountdown) {
    return (
      <main className="screen-shell bau-center text-center">
        <section className="bau-card blue bau-stack animate-pulse" style={{ width: 'min(760px, 100%)', margin: 'auto' }}>
          <div className="screen-meta">Question 1 starts in</div>
          <div className="stat-value" style={{ fontSize: 'clamp(7rem, 18vw, 15rem)' }}>{gameCountdown.remaining}</div>
        </section>
      </main>
    );
  }
  if (!currentQuestion && skippedQuestion) {
    return (
      <main className="screen-shell bau-center text-center">
        <section className="bau-card yellow bau-stack" style={{ width: 'min(900px, 100%)', margin: 'auto' }}>
          <div className="screen-meta">Question Skipped</div>
          <h1 className="screen-title" style={{ fontSize: 'clamp(3rem, 8vw, 8rem)' }}>Waiting for Next Question</h1>
        </section>
      </main>
    );
  }
  if (!currentQuestion) return <main className="screen-shell" />;
  const { text, type, options, questionNumber, totalQuestions, image } = currentQuestion;

  return (
    <main className="screen-shell">
      <header className="screen-header"><div><div className="screen-meta">Question {questionNumber} of {totalQuestions}</div><h1 className="screen-title">{text}</h1></div><div className={'screen-timer ' + (timer.remaining <= 5 ? 'danger' : '')}>{timer.remaining}</div></header>
      {image && <img src={image} alt="Question" className="bau-card" style={{ maxHeight: 280, objectFit: 'contain', alignSelf: 'center' }} />}
      {(type === 'mcq' || type === 'truefalse') && (
        <section className="screen-option-grid">
          {options.map((opt: any, i: number) => <div key={i} className={'bau-card screen-option option-color-' + (opt.label || String.fromCharCode(65 + i)).toLowerCase()}><span className="answer-label" style={{ minWidth: 72, height: 72, fontSize: '2rem' }}>{opt.label}</span><span>{opt.text}</span></div>)}
        </section>
      )}
      {type === 'identification' && <section className="bau-card yellow text-center" style={{ margin: 'auto', width: 'min(900px, 100%)' }}><h2 className="bau-title-lg">Type Your Answer</h2></section>}
    </main>
  );
}
