import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { apiPath } from '../../config/api';

export default function Dashboard() {
  const { isHostAuthenticated, hostState, socket, hostAnswerCount, hostPreview, hostCurrentQuestion, timer, isGameEnded, gameCountdown, hostError, revealData } = useSocket();
  const navigate = useNavigate();
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [dashboardNotice, setDashboardNotice] = useState('');

  useEffect(() => {
    if (!isHostAuthenticated) {
      navigate('/host/login');
    } else {
      fetch(apiPath('/api/question-sets')).then(res => res.json()).then(data => setQuestionSets(Array.isArray(data) ? data : [])).catch(console.error);
    }
  }, [isHostAuthenticated, navigate]);

  if (!isHostAuthenticated) return null;

  const handleStartGame = () => {
    if (!selectedSet) {
      setDashboardNotice('Select a question set before starting.');
      return;
    }
    setDashboardNotice('');
    socket?.emit('host:start_game', { questionSetId: selectedSet });
  };

  const isActiveGame = hostState?.status === 'active';
  const gameEnded = isGameEnded || hostState?.status === 'ended';
  const showGameControls = isActiveGame || gameEnded;
  const answerRevealed = !!revealData?.global;
  const hasMoreQuestions = !!hostPreview;
  const canRevealEarly = timer.remaining > 0 && !answerRevealed;
  const canEndEarly = isActiveGame && !gameEnded;

  return (
    <div className="host-shell">
      <nav className="host-nav">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span><span>JPCS Quiz Game Host</span></div>
        <div className="bau-row"><Link className="bau-button ghost" to="/host/editor">Editor</Link></div>
      </nav>

      <main className="host-main host-grid">
        <section className="bau-stack">
          {!showGameControls ? (
            <div className="bau-card bau-stack">
              <h1 className="bau-title-md">Start Game</h1>
              {(dashboardNotice || hostError) && <p className="bau-error" role="alert">{dashboardNotice || hostError}</p>}
              <div className="bau-row" style={{ alignItems: 'stretch' }}>
                <select className="bau-select" value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)}>
                  <option value="">Select question set</option>
                  {questionSets.map(s => <option key={s.id} value={s.id}>{s.name || s.title}</option>)}
                </select>
                <button className="bau-button primary" onClick={handleStartGame} disabled={!selectedSet}>Start</button>
              </div>
            </div>
          ) : (
            <div className="bau-card bau-stack">
              <h1 className="bau-title-md">Game Controls</h1>
              {hostError && <p className="bau-error" role="alert">{hostError}</p>}
              {gameCountdown ? (
                <div className="bau-card blue compact no-shadow text-center bau-stack">
                  <div className="bau-kicker">Starting Question 1</div>
                  <div className="stat-value">{gameCountdown.remaining}</div>
                </div>
              ) : hostPreview ? (
                <div className="bau-card yellow compact no-shadow bau-stack">
                  <div className="bau-kicker">Up next: Question {hostPreview.questionNumber} of {hostPreview.totalQuestions}</div>
                  <h2 className="bau-title-md">{hostPreview.question}</h2>
                  <p><strong>Answer:</strong> {hostPreview.answer}</p>
                  <div className="bau-row" style={{ flexWrap: 'wrap' }}>
                    <button className="bau-button primary" onClick={() => socket?.emit('host:launch_question')}>Launch Question</button>
                    {canEndEarly && <button className="bau-button danger" onClick={() => socket?.emit('host:end_game')}>End Game Early</button>}
                  </div>
                </div>
              ) : gameEnded ? (
                <div className="bau-stack"><h2 className="bau-title-md">Game Ended</h2><button className="bau-button primary" onClick={() => socket?.emit('host:reset_room')}>Reset Room</button></div>
              ) : (
                <p className="text-muted">Waiting for next phase.</p>
              )}

              {timer.remaining > 0 && !hostPreview && (
                <div className="bau-card compact no-shadow bau-stack">
                  <div className="bau-row between"><h2 className="bau-title-md">Live Question</h2><strong className="screen-timer" style={{ minWidth: 96, fontSize: '2.4rem', padding: 8 }}>{timer.remaining}</strong></div>
                  {hostCurrentQuestion && (
                    <div className="bau-stack">
                      <div className="bau-kicker">Question {hostCurrentQuestion.questionNumber} of {hostCurrentQuestion.totalQuestions}</div>
                      <h3 className="bau-title-md">{hostCurrentQuestion.question}</h3>
                      {(hostCurrentQuestion.type === 'mcq' || hostCurrentQuestion.type === 'truefalse') && (
                        <div className="bau-stack">
                          {hostCurrentQuestion.options?.map((opt: any, i: number) => (
                            <div key={opt.label} className={'host-option-row option-color-' + (opt.label || String.fromCharCode(65 + i)).toLowerCase()}><span className="answer-label">{opt.label}</span><span>{opt.text}</span></div>
                          ))}
                        </div>
                      )}
                      {hostCurrentQuestion.type === 'identification' && <p className="bau-meta">Identification answer</p>}
                      <p><strong>Correct Answer:</strong> {hostCurrentQuestion.answer}</p>
                    </div>
                  )}
                  <div className="bau-row">
                    {timer.paused ? <button className="bau-button secondary" onClick={() => socket?.emit('host:resume_timer')}>Resume</button> : <button className="bau-button yellow" onClick={() => socket?.emit('host:pause_timer')}>Pause</button>}
                    {canRevealEarly && <button className="bau-button primary" onClick={() => socket?.emit('host:reveal_answer')}>Reveal Early</button>}
                    <button className="bau-button danger" onClick={() => socket?.emit('host:skip_question')}>Skip</button>
                    {canEndEarly && <button className="bau-button danger" onClick={() => socket?.emit('host:end_game')}>End Game Early</button>}
                  </div>
                </div>
              )}

              {timer.remaining === 0 && !gameCountdown && !gameEnded && !hasMoreQuestions && (
                <div className="bau-row" style={{ flexWrap: 'wrap' }}>
                  <button className="bau-button secondary" onClick={() => socket?.emit('host:show_leaderboard')}>Leaderboard</button>
                  <button className="bau-button danger" onClick={() => socket?.emit('host:end_game')}>End Game</button>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="bau-stack">
          <div className="bau-card yellow text-center"><div className="bau-kicker">Room PIN</div><div className="stat-value">{hostState?.roomPin || '------'}</div></div>
          <div className="bau-card bau-stack">
            <h2 className="bau-title-md">Live Status</h2>
            <div className="bau-row between"><span>Participants</span><strong>{hostState?.participantCount || 0}</strong></div>
            {isActiveGame && (
              <div className="bau-stack">
                <div className="bau-row between"><span>Answers</span><strong>{hostAnswerCount.answered} / {hostAnswerCount.total}</strong></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: (hostAnswerCount.percentage || 0) + '%' }} /><div className="progress-label">{hostAnswerCount.percentage || 0}%</div></div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
