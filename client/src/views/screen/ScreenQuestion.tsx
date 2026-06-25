import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function ScreenQuestion() {
  const { currentQuestion, revealData, isGameEnded, timer, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (revealData) navigate('/screen/reveal'); if (isGameEnded) navigate('/screen/podium'); }, [revealData, isGameEnded, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onQuestionSkipped = () => navigate('/screen/lobby');
    socket.on('question:skipped', onQuestionSkipped);
    return () => { socket.off('question:skipped', onQuestionSkipped); };
  }, [socket, navigate]);

  if (!currentQuestion) return <main className="screen-shell" />;
  const { text, type, options, questionNumber, totalQuestions, image } = currentQuestion;

  return (
    <main className="screen-shell">
      <header className="screen-header"><div><div className="screen-meta">Question {questionNumber} of {totalQuestions}</div><h1 className="screen-title">{text}</h1></div><div className={'screen-timer ' + (timer.remaining <= 5 ? 'danger' : '')}>{timer.remaining}</div></header>
      {image && <img src={image} alt="Question" className="bau-card" style={{ maxHeight: 280, objectFit: 'contain', alignSelf: 'center' }} />}
      {(type === 'mcq' || type === 'truefalse') && (
        <section className="screen-option-grid">
          {options.map((opt: any, i: number) => <div key={i} className="bau-card screen-option"><span className="answer-label" style={{ minWidth: 72, height: 72, fontSize: '2rem' }}>{opt.label}</span><span>{opt.text}</span></div>)}
        </section>
      )}
      {type === 'identification' && <section className="bau-card yellow text-center" style={{ margin: 'auto', width: 'min(900px, 100%)' }}><h2 className="bau-title-lg">Type Your Answer</h2></section>}
    </main>
  );
}
