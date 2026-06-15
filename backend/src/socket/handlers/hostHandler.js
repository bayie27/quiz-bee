const gameState = require('../../services/gameStateManager');
const supabase = require('../../config/supabase');

/**
 * Host Socket.io Event Handlers — Phase 3: Core Game Loop
 *
 * Implements the full game lifecycle:
 *   host:auth         → FR-64   PIN authentication
 *   host:start_game   → FR-23   Lobby → Active transition, blocks new joins (FR-10)
 *   host:launch_question → FR-25/26   Push question live, start server timer
 *   host:pause_timer   → FR-66   Freeze timer, block submissions
 *   host:resume_timer  → FR-66   Resume timer, unblock submissions
 *   host:skip_question → FR-67   Skip without reveal, 0 points
 *   host:reveal_answer → FR-29/30 Answer distribution + per-participant score
 *   host:show_leaderboard → FR-31/43 Top N display
 *   host:kick_participant → FR-68 Full erasure from memory
 *   host:reset_room    → FR-02   Reset to lobby, preserve question sets
 */
module.exports = (io, socket) => {

  // ──────────────────────────────────────────────
  // host:auth — FR-64
  // ──────────────────────────────────────────────
  socket.on('host:auth', ({ pin }) => {
    if (pin !== gameState.roomConfig.hostPin) {
      return socket.emit('host:auth_error', { reason: 'Invalid host PIN.' });
    }

    socket.join('host');
    socket.emit('host:auth_success', {
      status: gameState.status,
      participantCount: gameState.getParticipantCount(),
      participants: gameState.getParticipantList(),
      roomPin: gameState.roomConfig.roomPin
    });

    console.log(`[HOST] Host authenticated from socket ${socket.id}`);
  });

  // ──────────────────────────────────────────────
  // host:start_game — FR-23, FR-10
  //
  // 1. Validates lobby state and participant count
  // 2. Fetches question set + scoring config from Supabase
  // 3. Transitions state to 'active' → blocks all future joins
  // 4. Emits game:started to all rooms
  // 5. Sends first question preview to host (FR-24)
  // ──────────────────────────────────────────────
  socket.on('host:start_game', async ({ questionSetId }) => {
    // ── Pre-flight validation ──
    if (gameState.status !== 'lobby') {
      return socket.emit('host:error', { reason: 'Game can only be started from lobby state.' });
    }

    if (!questionSetId) {
      return socket.emit('host:error', { reason: 'A question set must be selected.' });
    }

    if (gameState.participants.size === 0) {
      return socket.emit('host:error', { reason: 'Cannot start game with no participants.' });
    }

    try {
      // ── Fetch questions from Supabase (ordered by order_index) ──
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .order('order_index', { ascending: true });

      if (qError) throw qError;
      if (!questions || questions.length === 0) {
        return socket.emit('host:error', { reason: 'Selected question set has no questions.' });
      }

      // ── Fetch scoring config from question set (FR-42) ──
      const { data: qSet, error: qsError } = await supabase
        .from('question_sets')
        .select('scoring_config')
        .eq('id', questionSetId)
        .single();

      if (qsError) throw qsError;

      // ── Transition state to 'active' ──
      const startResult = gameState.startGame(questionSetId, questions, qSet?.scoring_config);
      if (!startResult.success) {
        return socket.emit('host:error', { reason: startResult.error });
      }

      // ── Emit game:started to ALL rooms ──
      // After this event, participant:join will be rejected with "Game already in progress" (FR-10)
      io.to('game').to('host').to('screen').emit('game:started', {
        totalQuestions: questions.length,
        participantCount: gameState.getParticipantCount()
      });

      // ── Send first question preview to host (FR-24) ──
      const preview = gameState.getNextQuestionPreview();
      if (preview) {
        socket.emit('question:preview', preview);
      }

      console.log(`[GAME] Started — set: ${questionSetId}, questions: ${questions.length}, participants: ${gameState.getParticipantCount()}`);
    } catch (err) {
      console.error('[GAME] Error starting game:', err);
      socket.emit('host:error', { reason: 'Failed to load questions from database.' });
    }
  });

  // ──────────────────────────────────────────────
  // host:launch_question — FR-25, FR-26, FR-27
  //
  // 1. Advances to next question via GameStateManager
  // 2. Emits question:live to 'game' + 'screen' (no correct answer)
  // 3. Sends question:preview to host (with correct answer)
  // 4. Starts server-side 1s interval timer
  // 5. On timer expiry: hard-closes answer window (FR-27),
  //    emits question:closed to all rooms
  // ──────────────────────────────────────────────
  socket.on('host:launch_question', () => {
    if (gameState.status !== 'active') {
      return socket.emit('host:error', { reason: 'No active game.' });
    }

    const launched = gameState.launchNextQuestion();

    // ── No more questions → end game ──
    if (!launched) {
      endGameSequence();
      return;
    }

    const { question, questionNumber, total } = launched;

    // ── Send question:live to participants, screen, and host (FR-25) ──
    io.to('game').to('screen').to('host').emit('question:live', {
      questionId: question.id,
      type: question.type,
      text: question.text,
      options: question.options,
      image: question.image_url,
      timer: question.timer_seconds,
      questionNumber,
      totalQuestions: total
    });

    // ── Reset host answer counter (FR-69) ──
    io.to('host').emit('host:answer_count', gameState.getAnswerStatus());

    // ── Start server-side countdown (FR-26) ──
    gameState.startTimer(
      // onTick — fires every second
      ({ remaining }) => {
        // Broadcast timer:tick to all rooms
        io.to('game').to('host').to('screen').emit('timer:tick', { remaining });

        // Update host with live answer count (FR-69)
        io.to('host').emit('host:answer_count', gameState.getAnswerStatus());
      },

      // onExpire — FR-27: Hard-close the answer window
      () => {
        const answerStatus = gameState.getAnswerStatus();

        // Emit question:closed to ALL rooms so everyone knows the window is shut
        io.to('game').to('host').to('screen').emit('question:closed', {
          questionId: question.id,
          totalAnswers: answerStatus.answered,
          totalParticipants: answerStatus.total
        });

        console.log(`[TIMER] Q${questionNumber} expired — ${answerStatus.answered}/${answerStatus.total} answered`);
      }
    );

    console.log(`[QUESTION] Launched Q${questionNumber}/${total}: "${question.text.substring(0, 60)}"`);
  });

  // ──────────────────────────────────────────────
  // host:pause_timer — FR-66
  // Freezes timer on all screens. Submissions blocked while paused.
  // ──────────────────────────────────────────────
  socket.on('host:pause_timer', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to pause.' });
    }

    const { remaining } = gameState.pauseTimer();
    io.to('game').to('host').to('screen').emit('timer:paused', { remaining });

    console.log(`[TIMER] Paused at ${remaining}s`);
  });

  // ──────────────────────────────────────────────
  // host:resume_timer — FR-66
  // ──────────────────────────────────────────────
  socket.on('host:resume_timer', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to resume.' });
    }

    const { remaining } = gameState.resumeTimer();
    io.to('game').to('host').to('screen').emit('timer:resumed', { remaining });

    console.log(`[TIMER] Resumed at ${remaining}s`);
  });

  // ──────────────────────────────────────────────
  // host:skip_question — FR-67
  // Skips question, awards 0 points, closes answer window.
  // Resets streaks for everyone who didn't answer (treated as no-answer → FR-39).
  // ──────────────────────────────────────────────
  socket.on('host:skip_question', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to skip.' });
    }

    const skippedQuestionId = gameState.currentQuestion.id;

    // Close the answer window and stop the timer
    gameState.closeAnswerWindow();

    // Reset streaks for participants who didn't answer (FR-39: no answer = 0 pts + streak reset)
    for (const participant of gameState.participants.values()) {
      if (!participant.answeredCurrentQuestion) {
        participant.streak = 0;
      }
    }

    // Notify all rooms
    io.to('game').to('host').to('screen').emit('question:skipped', {
      questionId: skippedQuestionId
    });

    // Send next question preview to host if available (FR-24)
    const preview = gameState.getNextQuestionPreview();
    if (preview) {
      socket.emit('question:preview', preview);
    }

    console.log(`[QUESTION] Skipped Q${gameState.currentQuestionIndex + 1}`);
  });

  // ──────────────────────────────────────────────
  // host:reveal_answer — FR-29, FR-30, FR-49, FR-57
  //
  // 1. Calculates answer distribution (FR-49)
  // 2. Emits answer:revealed to screen + host (distribution chart)
  // 3. Emits score:update to each participant individually (FR-57)
  //    with full breakdown: correct/incorrect, base + speed + streak, total, rank
  // ──────────────────────────────────────────────
  socket.on('host:reveal_answer', () => {
    if (!gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No question to reveal.' });
    }

    const revealedQuestionId = gameState.currentQuestion.id;

    // Revealing is an explicit host-controlled close of the answer window.
    // Stop any running timer and push the authoritative 0s state to clients.
    gameState.closeAnswerWindow();
    const answerStatus = gameState.getAnswerStatus();
    io.to('game').to('host').to('screen').emit('timer:tick', { remaining: 0 });
    io.to('game').to('host').to('screen').emit('question:closed', {
      questionId: revealedQuestionId,
      totalAnswers: answerStatus.answered,
      totalParticipants: answerStatus.total
    });

    const correctAnswer = gameState.currentQuestion.correct_answer;
    const { distribution, noAnswerCount, totalParticipants, totalAnswered } = gameState.getAnswerDistribution();

    // ── Emit answer:revealed to big screen + host (FR-49) ──
    // Shows the distribution bar chart and highlights the correct answer
    io.to('screen').to('host').emit('answer:revealed', {
      correct: correctAnswer,
      distribution,
      noAnswerCount,
      totalParticipants,
      totalAnswered
    });

    // ── Emit per-participant score:update (FR-57) ──
    // Each participant sees: correct/wrong, points earned, breakdown, running total, rank
    const scoreUpdates = gameState.getParticipantScoreUpdates();
    for (const [socketId, update] of scoreUpdates.entries()) {
      io.to(socketId).emit('score:update', {
        isCorrect: update.isCorrect,
        answered: update.answered,
        points: update.points,
        breakdown: update.breakdown,
        totalScore: update.totalScore,
        rank: update.rank,
        streak: update.streak,
        bestStreak: update.bestStreak
      });
    }

    // Also send a general reveal event to the game room for UI state transition
    io.to('game').emit('answer:revealed', {
      correct: correctAnswer
    });

    // Send next question preview to host if available (FR-24)
    const preview = gameState.getNextQuestionPreview();
    if (preview) {
      socket.emit('question:preview', preview);
    } else {
      socket.emit('question:preview', null); // signal: no more questions
    }

    console.log(`[REVEAL] Correct: ${correctAnswer} | Answered: ${totalAnswered}/${totalParticipants} | No answer: ${noAnswerCount}`);
  });

  // ──────────────────────────────────────────────
  // host:show_leaderboard — FR-31, FR-43
  //
  // Sorts participants by score (with tie-breaking by avg answer time),
  // emits the top N to screen + game + host rooms.
  // ──────────────────────────────────────────────
  socket.on('host:show_leaderboard', (payload) => {
    const topN = payload?.topN || 10;
    const leaderboard = gameState.getLeaderboard(topN);

    // Emit to all rooms simultaneously
    io.to('screen').to('game').to('host').emit('leaderboard:show', {
      top: leaderboard
    });

    console.log(`[LEADERBOARD] Showing top ${leaderboard.length} participants`);
  });

  // ──────────────────────────────────────────────
  // host:kick_participant — FR-68
  // Complete erasure from memory (locked requirement)
  // ──────────────────────────────────────────────
  socket.on('host:kick_participant', ({ participantId }) => {
    if (!participantId) {
      return socket.emit('host:error', { reason: 'Participant ID is required.' });
    }

    const result = gameState.kickParticipant(participantId);
    if (!result) {
      return socket.emit('host:error', { reason: 'Participant not found.' });
    }

    // Notify the kicked participant before disconnecting them
    io.to(result.socketId).emit('participant:kicked', {});

    // Force the kicked socket to leave the game room and disconnect
    const kickedSocket = io.sockets.sockets.get(result.socketId);
    if (kickedSocket) {
      kickedSocket.leave('game');
      kickedSocket.disconnect(true);
    }

    // Broadcast updated participant list to remaining clients
    io.to('game').to('host').to('screen').emit('lobby:update', {
      participants: gameState.getParticipantList(),
      count: gameState.getParticipantCount()
    });

    console.log(`[KICK] Erased ${result.participant.name} (${result.participant.section}) from session`);
  });

  // ──────────────────────────────────────────────
  // host:reset_room — FR-02
  // Resets room to lobby, clears all participants and scores.
  // Does NOT alter saved question sets in the database.
  // ──────────────────────────────────────────────
  socket.on('host:reset_room', () => {
    gameState.reset();

    const resetState = {
      status: 'lobby',
      roomPin: gameState.roomConfig.roomPin,
      participantCount: 0,
      participants: []
    };

    // Notify all open clients before removing sockets from rooms so stale
    // game-over/question state is cleared immediately.
    io.to('game').to('host').to('screen').emit('room:reset', resetState);

    // Disconnect all participants and screen from their rooms
    io.in('game').socketsLeave('game');
    socket.emit('host:room_reset', resetState);

    console.log('[ROOM] Room reset to lobby state');
  });

  // ──────────────────────────────────────────────
  // host:end_game — Manual end-game trigger
  // Host can end the game at any point (before all questions are done)
  // ──────────────────────────────────────────────
  socket.on('host:end_game', () => {
    if (gameState.status !== 'active') {
      return socket.emit('host:error', { reason: 'No active game to end.' });
    }
    endGameSequence();
  });

  // ══════════════════════════════════════════════
  // Internal: End Game Sequence
  // ══════════════════════════════════════════════

  /**
   * Runs the full end-game sequence:
   * 1. Transitions state to 'ended'
   * 2. Emits podium:play to screen (FR-44)
   * 3. Emits game:ended with full leaderboard to all rooms
   * 4. Emits result:card to each individual participant (FR-59)
   * 5. Persists results to Supabase (FR-05)
   */
  function endGameSequence() {
    gameState.endGame();
    const podium = gameState.getPodium();
    const fullLeaderboard = gameState.getLeaderboard(gameState.participants.size);

    // ── FR-44: Podium animation on big screen ──
    io.to('screen').emit('podium:play', { top5: podium });

    // ── FR-33: Game ended with full leaderboard ──
    io.to('game').to('host').to('screen').emit('game:ended', {
      finalLeaderboard: fullLeaderboard
    });

    // ── FR-59: Result card data to each participant ──
    for (const [socketId, participant] of gameState.participants.entries()) {
      io.to(socketId).emit('result:card', {
        rank: participant.rank,
        score: participant.score,
        bestStreak: participant.bestStreak,
        name: participant.name,
        section: participant.section,
        avatar: participant.avatar,
        accentColor: participant.accentColor
      });
    }

    // ── FR-05: Persist to Supabase ──
    persistResults();

    console.log(`[GAME] Ended — ${gameState.participants.size} participants, podium sent`);
  }

  // ══════════════════════════════════════════════
  // Internal: Persist Results to Supabase (FR-05)
  // ══════════════════════════════════════════════

  async function persistResults() {
    if (!supabase) {
      console.warn('[PERSIST] Supabase not configured, skipping result persistence.');
      return;
    }

    try {
      // Create session record
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          question_set_id: gameState.questionSetId,
          started_at: gameState.gameStartedAt,
          ended_at: new Date().toISOString(),
          participant_count: gameState.participants.size
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      // Insert all participant results
      const results = gameState.getFinalResults().map(r => ({
        session_id: session.id,
        ...r
      }));

      if (results.length > 0) {
        const { error: resultsError } = await supabase
          .from('session_results')
          .insert(results);

        if (resultsError) throw resultsError;
      }

      console.log(`[PERSIST] Session ${session.id} saved — ${results.length} participant results`);
    } catch (err) {
      console.error('[PERSIST] Error saving results:', err);
    }
  }
};
