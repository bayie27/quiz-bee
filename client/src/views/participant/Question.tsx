import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Question() {
  const { socket, currentQuestion, timer, revealData, isGameEnded, playTick } = useSocket();
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (revealData) navigate('/reveal'); if (isGameEnded) navigate('/end'); }, [revealData, isGameEnded, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onAnswerLocked = () => { setIsSubmitting(false); setIsLocked(true); };
    const onAnswerError = ({ reason }: { reason: string }) => { setIsSubmitting(false); setError(reason); };
    socket.on('answer:locked', onAnswerLocked);
    socket.on('answer:error', onAnswerError);
    return () => { socket.off('answer:locked', onAnswerLocked); socket.off('answer:error', onAnswerError); };
  }, [socket]);
  useEffect(() => { setIsLocked(false); setAnswer(''); setError(''); }, [currentQuestion?.questionId]);
  useEffect(() => { if (timer.remaining <= 5 && timer.remaining > 0 && !isLocked && !timer.paused) playTick(); }, [timer.remaining, timer.paused, isLocked, playTick]);

  const handleSubmit = (val?: string) => {
    if (isLocked || isSubmitting || timer.remaining <= 0 || timer.paused || !socket) return;
    setIsSubmitting(true);
    setError('');
    socket.emit('participant:answer', { questionId: currentQuestion.questionId, answer: val ?? answer });
  };

  if (!currentQuestion) return null;
  const isTimeUp = timer.remaining <= 0;
  const disabled = isLocked || isSubmitting || isTimeUp || timer.paused;

  return (
    <main className="bau-mobile-screen">
      <div className="bau-row between">
        <div className="bau-kicker">Q{currentQuestion.questionNumber} / {currentQuestion.totalQuestions}</div>
        <div className={'screen-timer ' + (isTimeUp ? 'danger' : '')} style={{ minWidth: 92, fontSize: '2.5rem', padding: '8px 12px' }}>{timer.remaining}</div>
      </div>
      <section className="bau-card animate-fade-in-up bau-stack" style={{ flex: 1 }}>
        <h1 className="bau-title-md">{currentQuestion.text}</h1>
        {error && <p className="bau-error" role="alert">{error}</p>}
        {isLocked ? (
          <div className="bau-stack text-center" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <div className="bau-card yellow compact no-shadow" style={{ width: 88, height: 88, display: 'grid', placeItems: 'center', fontWeight: 900 }}>LOCK</div>
            <h2 className="bau-title-md">Answer Locked</h2>
            <p className="text-muted">Waiting for the reveal.</p>
          </div>
        ) : (
          <div className="bau-stack" style={{ marginTop: 'auto' }}>
            {currentQuestion.type === 'identification' ? (
              <form className="bau-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <input className="bau-input" type="text" placeholder="Type your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={disabled} />
                <button className="bau-button primary full" type="submit" disabled={disabled || !answer.trim()}>Submit</button>
              </form>
            ) : (
              currentQuestion.options?.map((opt: any, i: number) => (
                <button key={i} className="bau-button answer-button" type="button" onClick={() => handleSubmit(opt.label || opt.text)} disabled={disabled}>
                  <span className="answer-label">{opt.label}</span>
                  <span>{opt.text}</span>
                </button>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
