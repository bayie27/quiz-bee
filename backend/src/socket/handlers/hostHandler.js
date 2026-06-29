const gameState = require('../../services/gameStateManager');
const supabase = require('../../config/supabase');
const { flushLobbyUpdate } = require('../lobbyBroadcaster');
const { flushAnswerCount } = require('../answerCountBroadcaster');

const FIRST_QUESTION_COUNTDOWN_SECONDS = 5;

module.exports = (io, socket) => {
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

  socket.on('host:start_game', async ({ questionSetId }) => {
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
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('question_set_id', questionSetId)
        .order('order_index', { ascending: true });

      if (qError) throw qError;
      if (!questions || questions.length === 0) {
        return socket.emit('host:error', { reason: 'Selected question set has no questions.' });
      }

      const { data: qSet, error: qsError } = await supabase
        .from('question_sets')
        .select('scoring_config')
        .eq('id', questionSetId)
        .single();

      if (qsError) throw qsError;

      const startResult = gameState.startGame(questionSetId, questions, qSet?.scoring_config);
      if (!startResult.success) {
        return socket.emit('host:error', { reason: startResult.error });
      }

      io.to('game').to('host').to('screen').emit('game:started', {
        totalQuestions: questions.length,
        participantCount: gameState.getParticipantCount()
      });

      startFirstQuestionCountdown();

      console.log(`[GAME] Started - set: ${questionSetId}, questions: ${questions.length}, participants: ${gameState.getParticipantCount()}`);
    } catch (err) {
      console.error('[GAME] Error starting game:', err);
      socket.emit('host:error', { reason: 'Failed to load questions from database.' });
    }
  });

  socket.on('host:launch_question', () => {
    if (gameState.status !== 'active') {
      return socket.emit('host:error', { reason: 'No active game.' });
    }
    launchQuestion();
  });

  socket.on('host:pause_timer', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to pause.' });
    }

    const { remaining } = gameState.pauseTimer();
    io.to('game').to('host').to('screen').emit('timer:paused', { remaining });
    console.log(`[TIMER] Paused at ${remaining}s`);
  });

  socket.on('host:resume_timer', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to resume.' });
    }

    const { remaining } = gameState.resumeTimer();
    io.to('game').to('host').to('screen').emit('timer:resumed', { remaining });
    console.log(`[TIMER] Resumed at ${remaining}s`);
  });

  socket.on('host:skip_question', () => {
    if (gameState.status !== 'active' || !gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No active question to skip.' });
    }

    const skippedQuestionId = gameState.currentQuestion.id;
    const skippedNumber = gameState.currentQuestionIndex + 1;
    gameState.closeAnswerWindow();

    for (const participant of gameState.participants.values()) {
      if (!participant.answeredCurrentQuestion) {
        participant.streak = 0;
      }
    }

    io.to('game').to('host').to('screen').emit('timer:tick', { remaining: 0 });
    io.to('game').to('host').to('screen').emit('question:skipped', {
      questionId: skippedQuestionId
    });

    const preview = gameState.getNextQuestionPreview();
    io.to('host').emit('question:preview', preview || null);

    console.log(`[QUESTION] Skipped Q${skippedNumber}`);
  });

  socket.on('host:reveal_answer', () => {
    if (!gameState.currentQuestion) {
      return socket.emit('host:error', { reason: 'No question to reveal.' });
    }
    revealAnswer('manual');
  });

  socket.on('host:show_leaderboard', (payload) => {
    const topN = payload?.topN || 10;
    const leaderboard = gameState.getLeaderboard(topN);
    io.to('screen').to('game').to('host').emit('leaderboard:show', {
      top: leaderboard
    });
    console.log(`[LEADERBOARD] Showing top ${leaderboard.length} participants`);
  });

  socket.on('host:kick_participant', ({ participantId }) => {
    if (!participantId) {
      return socket.emit('host:error', { reason: 'Participant ID is required.' });
    }

    const result = gameState.kickParticipant(participantId);
    if (!result) {
      return socket.emit('host:error', { reason: 'Participant not found.' });
    }

    io.to(result.socketId).emit('participant:kicked', {});
    const kickedSocket = io.sockets.sockets.get(result.socketId);
    if (kickedSocket) {
      kickedSocket.leave('game');
      kickedSocket.disconnect(true);
    }

    broadcastLobbyUpdate();
    console.log(`[KICK] Erased ${result.participant.name} (${result.participant.section}) from session`);
  });

  socket.on('host:reset_room', () => {
    gameState.reset();

    const resetState = {
      status: 'lobby',
      roomPin: gameState.roomConfig.roomPin,
      participantCount: 0,
      participants: []
    };

    io.to('game').to('host').to('screen').emit('room:reset', resetState);
    io.in('game').socketsLeave('game');
    socket.emit('host:room_reset', resetState);

    console.log('[ROOM] Room reset to lobby state');
  });

  socket.on('host:end_game', () => {
    if (gameState.status !== 'active') {
      return socket.emit('host:error', { reason: 'No active game to end.' });
    }
    endGameSequence();
  });

  function startFirstQuestionCountdown() {
    let remaining = FIRST_QUESTION_COUNTDOWN_SECONDS;

    const emitCountdown = () => {
      io.to('game').to('host').to('screen').emit('game:countdown', {
        remaining,
        totalSeconds: FIRST_QUESTION_COUNTDOWN_SECONDS
      });
    };

    emitCountdown();
    const intervalId = setInterval(() => {
      remaining -= 1;
      emitCountdown();

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (gameState.status === 'active' && !gameState.currentQuestion) {
          launchQuestion();
        }
      }
    }, 1000);
  }

  function launchQuestion() {
    const launched = gameState.launchNextQuestion();
    if (!launched) {
      endGameSequence();
      return;
    }

    const { question, questionNumber, total } = launched;

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

    io.to('host').emit('host:current_question', gameState.getCurrentQuestionPreview());
    flushAnswerCount(io);

    gameState.startTimer(
      ({ remaining }) => {
        io.to('game').to('host').to('screen').emit('timer:tick', { remaining });
        flushAnswerCount(io);
      },
      () => {
        const answerStatus = gameState.getAnswerStatus();
        io.to('game').to('host').to('screen').emit('question:closed', {
          questionId: question.id,
          totalAnswers: answerStatus.answered,
          totalParticipants: answerStatus.total
        });
        revealAnswer('timer');
        console.log(`[TIMER] Q${questionNumber} expired - ${answerStatus.answered}/${answerStatus.total} answered`);
      }
    );

    console.log(`[QUESTION] Launched Q${questionNumber}/${total}: "${question.text.substring(0, 60)}"`);
  }

  function revealAnswer(source) {
    if (!gameState.currentQuestion) return;

    const revealedQuestionId = gameState.currentQuestion.id;
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

    io.to('screen').to('host').emit('answer:revealed', {
      correct: correctAnswer,
      distribution,
      noAnswerCount,
      totalParticipants,
      totalAnswered
    });

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

    io.to('game').emit('answer:revealed', {
      correct: correctAnswer
    });

    const preview = gameState.getNextQuestionPreview();
    io.to('host').emit('question:preview', preview || null);

    console.log(`[REVEAL:${source}] Correct: ${correctAnswer} | Answered: ${totalAnswered}/${totalParticipants} | No answer: ${noAnswerCount}`);
  }
  function broadcastLobbyUpdate() {
    flushLobbyUpdate(io);
  }

  function endGameSequence() {
    gameState.endGame();
    const podium = gameState.getPodium();
    const fullLeaderboard = gameState.getLeaderboard(gameState.participants.size);

    io.to('screen').emit('podium:play', { top5: podium });
    io.to('game').emit('game:ended', {});
    io.to('host').to('screen').emit('game:ended', {
      finalLeaderboard: fullLeaderboard
    });

    emitResultCardsInBatches();

    persistResults();
    console.log(`[GAME] Ended - ${gameState.participants.size} participants, podium sent`);
  }

  function emitResultCardsInBatches() {
    const entries = Array.from(gameState.participants.entries());
    const batchSize = Number.parseInt(process.env.RESULT_CARD_BATCH_SIZE, 10) || 100;
    let index = 0;

    const emitBatch = () => {
      const end = Math.min(index + batchSize, entries.length);
      for (; index < end; index++) {
        const [socketId, participant] = entries[index];
        io.to(socketId).emit('result:card', {
          rank: participant.rank,
          score: participant.score,
          bestStreak: participant.bestStreak,
          name: participant.name,
          section: participant.section,
          avatar: participant.avatar
        });
      }

      if (index < entries.length) {
        setImmediate(emitBatch);
      }
    };

    emitBatch();
  }

  async function persistResults() {
    if (!supabase) {
      console.warn('[PERSIST] Supabase not configured, skipping result persistence.');
      return;
    }

    try {
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

      console.log(`[PERSIST] Session ${session.id} saved - ${results.length} participant results`);
    } catch (err) {
      console.error('[PERSIST] Error saving results:', err);
    }
  }
};
