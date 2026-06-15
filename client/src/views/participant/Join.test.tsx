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
  revealData: null,
  isGameEnded: false,
  resultCard: null,
  isHostAuthenticated: false,
  setIsHostAuthenticated: vi.fn(),
  hostState: null,
  setHostState: vi.fn(),
  hostAnswerCount: { answered: 0, total: 0, percentage: 0 },
  hostPreview: null,
  isScreenRegistered: false,
  registerScreen: vi.fn(),
  podiumData: null,
  leaderboardData: null
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
    expect(screen.getByPlaceholderText(/Room PIN/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Display Name/i)).toBeInTheDocument();
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
    
    fireEvent.change(screen.getByPlaceholderText(/Room PIN/i), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText(/Display Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. BSCS-3A/i), { target: { value: 'CS-101' } });

    const joinButton = screen.getByRole('button', { name: /^Join$/i });
    fireEvent.click(joinButton);

    expect(mockSocketContext.socket.emit).toHaveBeenCalledWith('participant:join', expect.objectContaining({
      pin: '123456',
      name: 'John Doe',
      section: 'CS-101',
    }));
  });
});
