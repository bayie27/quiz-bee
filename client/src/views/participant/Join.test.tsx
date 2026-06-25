import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Join from './Join';
import { SocketContext } from '../../contexts/SocketContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the socket context
const mockSocketContext = {
  socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
  isConnected: true,
  isJoined: false,
  participant: null,
  setParticipant: vi.fn(),
  lobbyData: { participants: [], count: 0 },
  timer: { remaining: 0, paused: false },
  currentQuestion: null,
  skippedQuestion: null,
  revealData: null,
  isGameEnded: false,
  resultCard: null,
  isHostAuthenticated: false,
  setIsHostAuthenticated: vi.fn(),
  hostState: null,
  setHostState: vi.fn(),
  hostAnswerCount: { answered: 0, total: 0, percentage: 0 },
  hostPreview: null,
  hostCurrentQuestion: null,
  gameCountdown: null,
  hostError: '',
  isScreenRegistered: false,
  registerScreen: vi.fn(),
  podiumData: null,
  leaderboardData: null,
  isMuted: false,
  setIsMuted: vi.fn(),
  playTick: vi.fn(),
  playChime: vi.fn(),
  playBuzz: vi.fn()
};

const renderJoin = () => {
  return render(
    <BrowserRouter>
      <SocketContext.Provider value={mockSocketContext}>
        <Join />
      </SocketContext.Provider>
    </BrowserRouter>
  );
};

describe('Join Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the join form correctly', () => {
    renderJoin();
    expect(screen.getByText(/Join Game/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. 000000/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/IT1B/i)).toBeInTheDocument();
  });

  it('validates empty fields on submit', () => {
    renderJoin();
    const joinButton = screen.getByRole('button', { name: /^Join$/i });
    fireEvent.click(joinButton);

    // Form shouldn't submit without required fields
    expect(mockSocketContext.socket.emit).not.toHaveBeenCalled();
  });

  it('submits correctly when fields are filled', () => {
    renderJoin();
    
    fireEvent.change(screen.getByPlaceholderText(/e.g. 000000/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Display Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/IT1B/i), { target: { value: 'CS-101' } });

    const joinButton = screen.getByRole('button', { name: /^Join$/i });
    fireEvent.click(joinButton);

    expect(mockSocketContext.socket.emit).toHaveBeenCalledWith('participant:join', expect.objectContaining({
      pin: '123456',
      name: 'John Doe',
      section: 'CS-101',
    }));
  });
});
