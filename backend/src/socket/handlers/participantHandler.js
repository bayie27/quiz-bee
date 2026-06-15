const gameState = require('../../services/gameStateManager');

/**
 * Participant Socket.io Event Handlers — Phase 3: Core Game Loop
 *
 * Implements:
 *   participant:join    → FR-06 through FR-10 (PIN, duplicates, capacity, game block)
 *   participant:rejoin  → FR-11 (grace period reconnection)
 *   participant:answer  → FR-27, FR-40, FR-41, FR-55, FR-69 (submit, score, lock-in)
 *   disconnect          → FR-11, FR-12 (grace period start/expiry)
 */
module.exports = (io, socket) => {

  // ──────────────────────────────────────────────
  // participant:join — FR-06, FR-08, FR-09, FR-10
  // ──────────────────────────────────────────────
  socket.on('participant:join', ({ name, section, pin, avatar, accentColor }) => {
    // Validate required fields
    if (!name || !name.trim()) {
      return socket.emit('join:error', { reason: 'Display name is required.' });
    }
    if (!section || !section.trim()) {
      return socket.emit('join:error', { reason: 'Section is required.' });
    }
    if (!pin) {
      return socket.emit('join:error', { reason: 'Room PIN is required.' });
    }

    // Attempt to add via GameStateManager (handles all validation)
    const result = gameState.addParticipant(socket.id, {
      name,
      section,
      pin,
      avatar,
      accentColor
    });

    if (!result.success) {
      return socket.emit('join:error', { reason: result.error });
    }

    // Success — join the 'game' Socket.io room
    socket.join('game');

    // Send success to the joining participant
    socket.emit('join:success', {
      participantId: result.participant.id,
      sessionToken: result.participant.sessionToken,
      name: result.participant.name,
      section: result.participant.section
    });

    // Broadcast updated participant list to everyone (FR-47, FR-52)
    io.to('game').to('host').to('screen').emit('lobby:update', {
      participants: gameState.getParticipantList(),
      count: gameState.getParticipantCount()
    });

    console.log(`[JOIN] ${result.participant.name} (${result.participant.section}) joined — total: ${gameState.getParticipantCount()}`);
  });

  // ──────────────────────────────────────────────
  // participant:rejoin — FR-11
  // ──────────────────────────────────────────────
  socket.on('participant:rejoin', ({ name, section, sessionToken }) => {
    if (!name || !section || !sessionToken) {
      return socket.emit('join:error', { reason: 'Missing reconnection data.' });
    }

    const result = gameState.rejoinParticipant(socket.id, {
      name,
      section,
      sessionToken
    });

    if (!result.success) {
      return socket.emit('join:error', { reason: result.error });
    }

    // Re-join the 'game' Socket.io room
    socket.join('game');

    // Send restored state so the client can re-render correctly
    socket.emit('join:success', {
      participantId: result.participant.id,
      sessionToken: result.participant.sessionToken,
      name: result.participant.name,
      section: result.participant.section,
      restored: true,
      score: result.participant.score,
      streak: result.participant.streak,
      rank: result.participant.rank,
      // If a question is currently live, send it so they can catch up
      currentQuestion: gameState.currentQuestion && gameState._answerWindowOpen
        ? {
          questionId: gameState.currentQuestion.id,
          type: gameState.currentQuestion.type,
          text: gameState.currentQuestion.text,
          options: gameState.currentQuestion.options,
          image: gameState.currentQuestion.image_url,
          timer: gameState.timerState.remaining,
          answered: result.participant.answeredCurrentQuestion
        }
        : null
    });

    // Broadcast updated count
    io.to('game').to('host').to('screen').emit('lobby:update', {
      participants: gameState.getParticipantList(),
      count: gameState.getParticipantCount()
    });

    console.log(`[REJOIN] ${result.participant.name} (${result.participant.section}) reconnected — score: ${result.participant.score}, streak: ${result.participant.streak}`);
  });

  // ──────────────────────────────────────────────
  // participant:answer — FR-27, FR-40, FR-41, FR-55, FR-69
  //
  // 1. Verifies game is active and answer window is open
  // 2. Verifies submission arrived before timer expired (FR-27)
  // 3. Passes answer to GameStateManager → Scoring Engine
  // 4. Updates participant's in-memory score and streak
  // 5. Emits answer:locked back to the specific participant (FR-55)
  // 6. Updates host:answer_count for dashboard (FR-69)
  // ──────────────────────────────────────────────
  socket.on('participant:answer', ({ questionId, answer }) => {
    // ── Guard: game must be active ──
    if (gameState.status !== 'active') {
      return socket.emit('answer:error', { reason: 'No active game.' });
    }

    // ── Guard: must have a current question ──
    if (!gameState.currentQuestion) {
      return socket.emit('answer:error', { reason: 'No active question.' });
    }

    // ── Submit to GameStateManager ──
    // All validation happens inside: answer window, timer cutoff,
    // paused check, first-submission-only, correctness, scoring
    const result = gameState.submitAnswer(socket.id, {
      questionId,
      answer
    });

    if (!result.success) {
      return socket.emit('answer:error', { reason: result.error });
    }

    // ── FR-55: Confirm answer was locked in ──
    // Send the lock-in confirmation with the question ID
    // The actual score breakdown is withheld until host:reveal_answer (FR-29)
    socket.emit('answer:locked', {
      questionId
    });

    // ── FR-69: Update host with live answer count ──
    const answerStatus = gameState.getAnswerStatus();
    io.to('host').emit('host:answer_count', answerStatus);

    // Log the submission
    const participant = gameState.participants.get(socket.id);
    console.log(
      `[ANSWER] ${participant?.name || 'unknown'} → Q${questionId} | ` +
      `${result.result.isCorrect ? '✓ CORRECT' : '✗ WRONG'} | ` +
      `+${result.result.pointsEarned} pts | ` +
      `Total: ${result.result.totalScore} | ` +
      `Streak: ${result.result.streak} | ` +
      `Rank: #${result.result.rank} | ` +
      `Progress: ${answerStatus.answered}/${answerStatus.total} (${answerStatus.percentage}%)`
    );

    // ── If all participants have answered, notify host ──
    if (gameState.allAnswersIn()) {
      io.to('host').emit('all_answers_in', {
        questionId,
        ...answerStatus
      });
      console.log(`[ANSWER] All answers in for Q${questionId}`);
    }
  });

  // ──────────────────────────────────────────────
  // disconnect — FR-11, FR-12
  //
  // In lobby: clean removal (can rejoin normally)
  // In active game: starts 10s grace period
  //   - If reconnected within 10s → session restored (FR-11)
  //   - If expired → permanently blocked from session (FR-12)
  // ──────────────────────────────────────────────
  socket.on('disconnect', () => {
    const participant = gameState.handleDisconnect(socket.id, (expiredParticipant) => {
      // Grace period expired callback — participant is now permanently blocked
      console.log(`[BLOCKED] ${expiredParticipant.name} (${expiredParticipant.section}) — reconnect grace period expired, permanently blocked`);

      // Broadcast updated count (they're gone for good)
      io.to('game').to('host').to('screen').emit('lobby:update', {
        participants: gameState.getParticipantList(),
        count: gameState.getParticipantCount()
      });
    });

    if (participant) {
      const inGame = gameState.status === 'active';
      console.log(
        `[DISCONNECT] ${participant.name} (${participant.section}) disconnected` +
        (inGame ? ` — ${gameState.roomConfig.reconnectGraceSeconds}s grace period started` : ' — removed from lobby')
      );

      // Broadcast updated count immediately
      io.to('game').to('host').to('screen').emit('lobby:update', {
        participants: gameState.getParticipantList(),
        count: gameState.getParticipantCount()
      });
    }
  });
};
