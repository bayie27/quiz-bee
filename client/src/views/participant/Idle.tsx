import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

export default function Idle() {
  const { currentQuestion, isGameEnded } = useSocket();
  const navigate = useNavigate();
  useEffect(() => {
    if (currentQuestion) navigate('/question');
    if (isGameEnded) navigate('/end');
  }, [currentQuestion, isGameEnded, navigate]);
  return (
    <main className="bau-mobile-screen bau-center">
      <section className="bau-card blue animate-pulse text-center bau-stack">
        <h1 className="bau-title-lg">Get Ready</h1>
        <p>Look at the big screen for the next question.</p>
      </section>
    </main>
  );
}
