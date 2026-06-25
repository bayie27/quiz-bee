import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenQuestion() {
  const { currentQuestion, revealData, isGameEnded, timer, socket } = useSocket();
  const navigate = useNavigate();


  useEffect(() => {
    if (revealData) navigate('/screen/reveal');
    if (isGameEnded) navigate('/screen/podium');
  }, [revealData, isGameEnded, navigate]);

  useEffect(() => {
    if (!socket) return;
    const onQuestionSkipped = () => navigate('/screen/lobby'); // or just clear it? We just wait for next question.
    socket.on('question:skipped', onQuestionSkipped);
    return () => {
      socket.off('question:skipped', onQuestionSkipped);
    };
  }, [socket, navigate]);

  if (!currentQuestion) return <div style={{ background: '#0f172a', height: '100vh' }}></div>;

  const { text, type, options, questionNumber, totalQuestions, image } = currentQuestion;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '60px'
    }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '2rem', color: '#d946ef', fontWeight: 'bold' }}>
          Question {questionNumber} of {totalQuestions}
        </div>
        <div style={{ 
          fontSize: '4rem', 
          fontWeight: 'bold', 
          color: timer.remaining <= 5 ? 'var(--color-danger)' : '#8b5cf6',
          background: 'rgba(255,255,255,0.1)',
          padding: '10px 40px',
          borderRadius: '20px'
        }}>
          {timer.remaining}
        </div>
      </div>

      {/* Question Text */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '4.5rem', lineHeight: '1.2', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{text}</h1>
        {image && <img src={image} alt="Question" style={{ maxHeight: '300px', borderRadius: '16px', marginTop: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />}
      </div>

      {/* Options */}
      {(type === 'mcq' || type === 'truefalse') && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '30px', 
          flex: 1, 
          alignContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          {options.map((opt: any, i: number) => (
            <div key={i} className="glass-card" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '30px', 
              padding: '40px',
              borderLeft: `8px solid ${['#ef4444', '#3b82f6', '#eab308', '#22c55e'][i % 4]}`
            }}>
              <div style={{ 
                width: '80px', height: '80px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '2.5rem', fontWeight: 'bold' 
              }}>
                {opt.label}
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{opt.text}</div>
            </div>
          ))}
        </div>
      )}

      {type === 'identification' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center', width: '100%', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>Type your answer...</h2>
          </div>
        </div>
      )}

    </div>
  );
}
