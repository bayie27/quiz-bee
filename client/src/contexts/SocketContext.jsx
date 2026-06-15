import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Participant State
  const [participant, setParticipant] = useState(null);
  const [lobbyData, setLobbyData] = useState({ participants: [], count: 0 });
  const [timer, setTimer] = useState({ remaining: 0, paused: false });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultCard, setResultCard] = useState(null);
  
  // Host State
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(false);
  const [hostState, setHostState] = useState(null);
  const [hostAnswerCount, setHostAnswerCount] = useState({ answered: 0, total: 0, percentage: 0 });
  const [hostPreview, setHostPreview] = useState(null);

  // Screen State
  const [isScreenRegistered, setIsScreenRegistered] = useState(false);
  const [podiumData, setPodiumData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    // Global listeners relevant to participants and host room status
    newSocket.on('lobby:update', (data) => {
      setLobbyData(data);
      setHostState(prev => prev ? {
        ...prev,
        participantCount: data.count,
        participants: data.participants,
        roomPin: data.roomPin || prev.roomPin
      } : null);
    });
    
    newSocket.on('timer:tick', ({ remaining }) => {
      setTimer(prev => ({ ...prev, remaining }));
    });
    
    newSocket.on('timer:paused', ({ remaining }) => {
      setTimer({ remaining, paused: true });
    });
    
    newSocket.on('timer:resumed', ({ remaining }) => {
      setTimer({ remaining, paused: false });
    });

    newSocket.on('question:live', (q) => {
      setCurrentQuestion(q);
      setRevealData(null);
      setLeaderboardData(null);
      setTimer({ remaining: q.timer, paused: false });
      setHostPreview(null);
      setIsGameEnded(false);
    });

    newSocket.on('question:closed', () => {
      setTimer(prev => ({ ...prev, remaining: 0 }));
    });

    newSocket.on('score:update', (data) => {
      setRevealData(prev => ({ ...prev, ...data }));
    });
    
    newSocket.on('answer:revealed', (data) => {
      setRevealData(prev => ({ ...prev, global: data }));
    });

    newSocket.on('game:started', (data) => {
      setIsGameEnded(false);
      setResultCard(null);
      setPodiumData(null);
      setLeaderboardData(null);
      setHostState(prev => prev ? {
        ...prev,
        status: 'active',
        participantCount: data?.participantCount ?? prev.participantCount
      } : null);
    });

    newSocket.on('game:ended', () => {
      setIsGameEnded(true);
      setHostState(prev => prev ? { ...prev, status: 'ended' } : null);
    });

    newSocket.on('result:card', (data) => {
      setResultCard(data);
    });

    // Host listeners
    newSocket.on('host:auth_success', (data) => {
      setIsHostAuthenticated(true);
      setHostState(data);
    });

    newSocket.on('host:answer_count', (data) => {
      setHostAnswerCount(data);
    });

    newSocket.on('question:preview', (preview) => {
      setHostPreview(preview);
    });

    newSocket.on('host:room_reset', (data) => {
      setHostState({
        ...data,
        participantCount: data.participantCount || 0,
        participants: data.participants || []
      });
      setLobbyData({
        participants: data.participants || [],
        count: data.participantCount || 0,
        roomPin: data.roomPin
      });
      setHostPreview(null);
      setHostAnswerCount({ answered: 0, total: 0, percentage: 0 });
      setTimer({ remaining: 0, paused: false });
      setCurrentQuestion(null);
      setRevealData(null);
      setLeaderboardData(null);
      setPodiumData(null);
      setResultCard(null);
      setIsGameEnded(false);
    });

    // Screen Listeners
    newSocket.on('screen:registered', () => {
      setIsScreenRegistered(true);
    });

    newSocket.on('screen:state', (state) => {
      setIsScreenRegistered(true);
      setLobbyData({
        participants: state.participants,
        count: state.count,
        roomPin: state.roomPin
      });
      if (state.currentQuestion) {
        setCurrentQuestion(state.currentQuestion);
        setTimer({ remaining: state.currentQuestion.timer, paused: false });
      }
    });

    newSocket.on('podium:play', (data) => {
      setPodiumData(data.top5);
    });

    newSocket.on('leaderboard:show', (data) => {
      setLeaderboardData(data.top);
    });

    newSocket.on('room:reset', (data = {}) => {
      setLobbyData({
        participants: data.participants || [],
        count: data.participantCount || 0,
        roomPin: data.roomPin
      });
      setTimer({ remaining: 0, paused: false });
      setCurrentQuestion(null);
      setRevealData(null);
      setResultCard(null);
      setHostPreview(null);
      setHostAnswerCount({ answered: 0, total: 0, percentage: 0 });
      setPodiumData(null);
      setLeaderboardData(null);
      setIsGameEnded(false);
      setHostState(prev => prev ? {
        ...prev,
        status: 'lobby',
        roomPin: data.roomPin || prev.roomPin,
        participantCount: data.participantCount || 0,
        participants: data.participants || []
      } : null);
    });

    return () => newSocket.close();
  }, []);

  const registerScreen = () => {
    if (socket) socket.emit('screen:register');
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      participant,
      setParticipant,
      lobbyData,
      timer,
      currentQuestion,
      revealData,
      isGameEnded,
      resultCard,
      isHostAuthenticated,
      setIsHostAuthenticated,
      hostState,
      setHostState,
      hostAnswerCount,
      hostPreview,
      isScreenRegistered,
      registerScreen,
      podiumData,
      leaderboardData
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
