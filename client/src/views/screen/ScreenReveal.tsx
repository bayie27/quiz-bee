import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ScreenReveal() {
  const { currentQuestion, revealData, leaderboardData, isGameEnded, socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (leaderboardData) navigate('/screen/leaderboard');
    if (isGameEnded) navigate('/screen/podium');
    if (!revealData) navigate('/screen/question');
  }, [leaderboardData, isGameEnded, revealData, navigate]);

  // Listen for next question launch
  useEffect(() => {
    if (!socket) return;
    const onQuestionLive = () => navigate('/screen/question');
    socket.on('question:live', onQuestionLive);
    return () => {
      socket.off('question:live', onQuestionLive);
    };
  }, [socket, navigate]);

  if (!revealData?.global || !currentQuestion) return <div style={{ background: '#0f172a', height: '100vh' }}></div>;

  const { correct, distribution, totalAnswered, totalParticipants } = revealData.global;
  const { text, type, options, questionNumber, totalQuestions } = currentQuestion;

  // Prepare data for recharts
  const chartData = Object.keys(distribution || {}).map(key => ({
    name: key,
    count: distribution[key] as number,
    isCorrect: key === correct || key.toLowerCase() === correct.toLowerCase()
  }));

  // Sort logically for options
  if (type === 'mcq' || type === 'truefalse') {
    chartData.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // For identification, just sort by count
    chartData.sort((a, b) => b.count - a.count);
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '2rem', color: '#d946ef', fontWeight: 'bold' }}>
          Question {questionNumber} / {totalQuestions}
        </div>
        <div style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>
          {totalAnswered} of {totalParticipants} Answered
        </div>
      </div>

      <h1 style={{ fontSize: '3.5rem', textAlign: 'center', marginBottom: '60px' }}>{text}</h1>

      <div style={{ display: 'flex', gap: '60px', flex: 1, alignItems: 'center' }}>
        
        {/* Correct Answer Display */}
        <div className="glass-card" style={{ flex: 1, textAlign: 'center', padding: '60px', border: `4px solid var(--color-success)` }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--color-success)', marginBottom: '20px' }}>Correct Answer</h2>
          <div style={{ fontSize: '5rem', fontWeight: 'bold' }}>{correct}</div>
          
          {(type === 'mcq' || type === 'truefalse') && (
            <div style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginTop: '20px' }}>
              {options.find((o: any) => o.label === correct)?.text}
            </div>
          )}
        </div>

        {/* Chart Display */}
        <div className="glass-card" style={{ flex: 2, height: '500px', padding: '40px' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '40px', textAlign: 'center' }}>Answer Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="white" fontSize={20} tickMargin={10} />
              <YAxis allowDecimals={false} stroke="white" fontSize={20} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.1)'}} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCorrect ? 'var(--color-success)' : 'var(--color-danger)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
