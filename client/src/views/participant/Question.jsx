import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Question() {
  const { socket, currentQuestion, timer, revealData, isGameEnded } = useSocket();
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (revealData) navigate('/reveal');
    if (isGameEnded) navigate('/end');
  }, [revealData, isGameEnded, navigate]);

  useEffect(() => {
    if (!socket) return;
    
    const onAnswerLocked = () => {
      setIsSubmitting(false);
      setIsLocked(true);
    };

    const onAnswerError = ({ reason }) => {
      setIsSubmitting(false);
      setError(reason);
    };

    socket.on('answer:locked', onAnswerLocked);
    socket.on('answer:error', onAnswerError);

    return () => {
      socket.off('answer:locked', onAnswerLocked);
      socket.off('answer:error', onAnswerError);
    };
  }, [socket]);

  // If question changes, reset lock
  useEffect(() => {
    setIsLocked(false);
    setAnswer('');
    setError('');
  }, [currentQuestion?.questionId]);

  const handleSubmit = (val) => {
    if (isLocked || isSubmitting || timer.remaining <= 0 || timer.paused) return;
    setIsSubmitting(true);
    setError('');
    const finalAnswer = val !== undefined ? val : answer;
    socket.emit('participant:answer', { questionId: currentQuestion.questionId, answer: finalAnswer });
  };

  if (!currentQuestion) return null;

  const isTimeUp = timer.remaining <= 0;
  const disabled = isLocked || isSubmitting || isTimeUp || timer.paused;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 'var(--space-md)', paddingBottom: 'var(--space-xl)' }}>
      {/* Timer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 className="text-muted">Q{currentQuestion.questionNumber} / {currentQuestion.totalQuestions}</h3>
        <div style={{
          background: isTimeUp ? 'var(--color-danger)' : 'var(--bg-card)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'bold',
          transition: 'var(--transition-base)'
        }}>
          {timer.remaining}s
        </div>
      </div>

      <div className="glass-card animate-fade-in-up" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.25rem' }}>{currentQuestion.text}</h2>
        {error && <p className="text-danger text-center" style={{ marginBottom: 'var(--space-md)' }}>{error}</p>}
        
        {isLocked ? (
          <div className="animate-pulse" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--color-success)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--space-md)', fontSize: '2rem'
            }}>
              🔒
            </div>
            <h3>Answer Locked!</h3>
            <p className="text-muted">Waiting for others...</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
            {currentQuestion.type === 'identification' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <input
                  type="text"
                  placeholder="Type your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={disabled}
                  style={inputStyle}
                />
                <button type="submit" disabled={disabled || !answer.trim()} style={{ ...buttonStyle, opacity: disabled ? 0.5 : 1 }}>Submit</button>
              </form>
            ) : (
              currentQuestion.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(opt.label || opt.text)}
                  disabled={disabled}
                  style={{
                    ...buttonStyle,
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'left',
                    opacity: disabled ? 0.5 : 1
                  }}
                >
                  {opt.label && <strong style={{ marginRight: 'var(--space-sm)', color: 'var(--color-primary-light)' }}>{opt.label}:</strong>}
                  {opt.text}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  background: 'rgba(0, 0, 0, 0.2)',
  color: 'white',
  fontSize: '1rem',
  outline: 'none',
  width: '100%'
};

const buttonStyle = {
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '1.1rem',
  cursor: 'pointer'
};
