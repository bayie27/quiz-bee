import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ScreenReveal() {
  const { currentQuestion, revealData, leaderboardData, isGameEnded, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => { if (leaderboardData) navigate('/screen/leaderboard'); if (isGameEnded) navigate('/screen/podium'); if (!revealData) navigate('/screen/question'); }, [leaderboardData, isGameEnded, revealData, navigate]);
  useEffect(() => {
    if (!socket) return;
    const onQuestionLive = () => navigate('/screen/question');
    socket.on('question:live', onQuestionLive);
    return () => { socket.off('question:live', onQuestionLive); };
  }, [socket, navigate]);

  if (!revealData?.global || !currentQuestion) return <main className="screen-shell" />;
  const { correct, distribution, totalAnswered, totalParticipants } = revealData.global;
  const { text, type, options, questionNumber, totalQuestions } = currentQuestion;
  const chartData = Object.keys(distribution || {}).map(key => ({ name: key, count: distribution[key] as number, isCorrect: key === correct || key.toLowerCase() === correct.toLowerCase() }));
  chartData.sort(type === 'mcq' || type === 'truefalse' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.count - a.count);

  return (
    <main className="screen-shell">
      <header className="screen-header"><div><div className="screen-meta">Question {questionNumber} of {totalQuestions}</div><h1 className="screen-title">{text}</h1></div><div className="screen-meta">{totalAnswered} / {totalParticipants} Answered</div></header>
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, .9fr) minmax(0, 1.5fr)', gap: 'var(--space-xl)', flex: 1, minHeight: 0 }}>
        <div className="bau-card yellow bau-stack text-center" style={{ justifyContent: 'center' }}><div className="bau-kicker">Correct Answer</div><h2 className="bau-title-lg">{correct}</h2>{(type === 'mcq' || type === 'truefalse') && <p style={{ fontSize: '2rem', fontWeight: 900 }}>{options.find((o: any) => o.label === correct)?.text}</p>}</div>
        <div className="bau-card bau-stack" style={{ minHeight: 0 }}><h2 className="bau-title-md text-center">Answer Distribution</h2><div style={{ flex: 1, minHeight: 360 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}><XAxis dataKey="name" stroke="#121212" fontSize={20} tickMargin={10} /><YAxis allowDecimals={false} stroke="#121212" fontSize={20} /><Tooltip cursor={{ fill: '#e0e0e0' }} contentStyle={{ background: '#ffffff', border: '3px solid #121212', borderRadius: 0 }} /><Bar dataKey="count">{chartData.map((entry, index) => <Cell key={'cell-' + index} fill={entry.isCorrect ? '#f0c020' : '#d02020'} />)}</Bar></BarChart></ResponsiveContainer></div></div>
      </section>
    </main>
  );
}
