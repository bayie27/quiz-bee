import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAudio } from '../hooks/useAudio';

export interface LobbyData {
  participants: any[];
  count: number;
  roomPin?: string;
}

export interface Timer {
  remaining: number;
  paused: boolean;
}

export interface HostAnswerCount {
  answered: number;
  total: number;
  percentage: number;
}

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  participant: any;
  setParticipant: React.Dispatch<React.SetStateAction<any>>;
  lobbyData: LobbyData;
  timer: Timer;
  currentQuestion: any;
  revealData: any;
  isGameEnded: boolean;
  resultCard: any;
  isHostAuthenticated: boolean;
  setIsHostAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  hostState: any;
  setHostState: React.Dispatch<React.SetStateAction<any>>;
  hostAnswerCount: HostAnswerCount;
  hostPreview: any;
  isScreenRegistered: boolean;
  registerScreen: () => void;
  podiumData: any;
  leaderboardData: any;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  playTick: () => void;
  playChime: () => void;
  playBuzz: () => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);

const rawSocketUrl = (import.meta.env.VITE_SERVER_URL as string) || 'http://localhost:3001';
let processedUrl = rawSocketUrl;
if (processedUrl && !processedUrl.includes('.') && !processedUrl.includes('localhost')) {
  processedUrl = `${processedUrl}.onrender.com`;
}
const SOCKET_URL = processedUrl && !processedUrl.startsWith('http') ? `https://${processedUrl}` : processedUrl;

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Participant State
  const [participant, setParticipant] = useState<any>(null);
  const [lobbyData, setLobbyData] = useState<LobbyData>({ participants: [], count: 0 });
  const [timer, setTimer] = useState<Timer>({ remaining: 0, paused: false });
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [revealData, setRevealData] = useState<any>(null);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [resultCard, setResultCard] = useState<any>(null);
  
  // Host State
  const [isHostAuthenticated, setIsHostAuthenticated] = useState(false);
  const [hostState, setHostState] = useState<any>(null);
  const [hostAnswerCount, setHostAnswerCount] = useState<HostAnswerCount>({ answered: 0, total: 0, percentage: 0 });
  const [hostPreview, setHostPreview] = useState<any>(null);

  // Screen State
  const [isScreenRegistered, setIsScreenRegistered] = useState(false);
  const [podiumData, setPodiumData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    // Global listeners relevant to participants and host room status
    newSocket.on('lobby:update', (data: any) => {
      setLobbyData(data);
      setHostState((prev: any) => prev ? {
        ...prev,
        participantCount: data.count,
        participants: data.participants,
        roomPin: data.roomPin || prev.roomPin
      } : null);
    });
    
    newSocket.on('timer:tick', ({ remaining }: { remaining: number }) => {
      setTimer(prev => ({ ...prev, remaining }));
    });
    
    newSocket.on('timer:paused', ({ remaining }: { remaining: number }) => {
      setTimer({ remaining, paused: true });
    });
    
    newSocket.on('timer:resumed', ({ remaining }: { remaining: number }) => {
      setTimer({ remaining, paused: false });
    });

    newSocket.on('question:live', (q: any) => {
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

    newSocket.on('score:update', (data: any) => {
      setRevealData((prev: any) => ({ ...prev, ...data }));
    });
    
    newSocket.on('answer:revealed', (data: any) => {
      setRevealData((prev: any) => ({ ...prev, global: data }));
    });

    newSocket.on('game:started', (data: any) => {
      setIsGameEnded(false);
      setResultCard(null);
      setPodiumData(null);
      setLeaderboardData(null);
      setHostState((prev: any) => prev ? {
        ...prev,
        status: 'active',
        participantCount: data?.participantCount ?? prev.participantCount
      } : null);
    });

    newSocket.on('game:ended', () => {
      setIsGameEnded(true);
      setHostState((prev: any) => prev ? { ...prev, status: 'ended' } : null);
    });

    newSocket.on('result:card', (data: any) => {
      setResultCard(data);
    });

    // Host listeners
    newSocket.on('host:auth_success', (data: any) => {
      setIsHostAuthenticated(true);
      setHostState(data);
    });

    newSocket.on('host:answer_count', (data: any) => {
      setHostAnswerCount(data);
    });

    newSocket.on('question:preview', (preview: any) => {
      setHostPreview(preview);
    });

    newSocket.on('host:room_reset', (data: any) => {
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

    newSocket.on('screen:state', (state: any) => {
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

    newSocket.on('podium:play', (data: any) => {
      setPodiumData(data.top5);
    });

    newSocket.on('leaderboard:show', (data: any) => {
      setLeaderboardData(data.top);
    });

    newSocket.on('join:success', (data: any) => {
      // Only set session data if this is a participant join event
      if (data.sessionToken) {
        setParticipant(data);
        localStorage.setItem('quizbee_session', JSON.stringify({
          name: data.name,
          section: data.section,
          sessionToken: data.sessionToken
        }));
      }
    });

    newSocket.on('participant:kicked', () => {
      localStorage.removeItem('quizbee_session');
      setParticipant(null);
      alert('You have been kicked from the game.');
      window.location.href = '/join';
    });

    newSocket.on('room:reset', (data: any = {}) => {
      localStorage.removeItem('quizbee_session');
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
      setHostState((prev: any) => prev ? {
        ...prev,
        status: 'lobby',
        roomPin: data.roomPin || prev.roomPin,
        participantCount: data.participantCount || 0,
        participants: data.participants || []
      } : null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const registerScreen = () => {
    if (socket) socket.emit('screen:register');
  };

  const { isMuted, setIsMuted, playTick, playChime, playBuzz } = useAudio();

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
      leaderboardData,
      isMuted,
      setIsMuted,
      playTick,
      playChime,
      playBuzz
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
