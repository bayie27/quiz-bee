const gameState = require('../../services/gameStateManager');

/**
 * Big Screen Socket.io Event Handlers
 *
 * The big screen is a passive display client that joins the 'screen' room.
 * It receives all display events (questions, reveals, leaderboard, podium)
 * via the 'screen' room broadcasts from the host handler.
 */
module.exports = (io, socket) => {

  // ──────────────────────────────────────────────
  // screen:register — SRS Section 7.1
  // ──────────────────────────────────────────────
  socket.on('screen:register', () => {
    socket.join('screen');

    // Send current state so the screen can render appropriately on connect
    socket.emit('screen:state', {
      status: gameState.status,
      participants: gameState.getParticipantList(),
      count: gameState.getParticipantCount(),
      roomPin: gameState.roomConfig.roomPin,
      currentQuestion: gameState.status === 'active' && gameState.currentQuestion
        ? {
          questionId: gameState.currentQuestion.id,
          type: gameState.currentQuestion.type,
          text: gameState.currentQuestion.text,
          options: gameState.currentQuestion.options,
          image: gameState.currentQuestion.image_url,
          timer: gameState.timerState.remaining,
          questionNumber: gameState.currentQuestionIndex + 1,
          totalQuestions: gameState.questions.length
        }
        : null
    });

    console.log(`[SCREEN] Big screen registered from socket ${socket.id}`);
  });
};
