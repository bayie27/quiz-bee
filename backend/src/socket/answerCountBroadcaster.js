const gameState = require('../services/gameStateManager');

const ANSWER_COUNT_UPDATE_MS = Number.parseInt(process.env.ANSWER_COUNT_UPDATE_MS, 10) || 250;
let pendingUpdate = null;

function emitAnswerCount(io) {
  io.to('host').emit('host:answer_count', gameState.getAnswerStatus());
}

function scheduleAnswerCount(io) {
  if (pendingUpdate) return;

  pendingUpdate = setTimeout(() => {
    pendingUpdate = null;
    emitAnswerCount(io);
  }, ANSWER_COUNT_UPDATE_MS);
}

function flushAnswerCount(io) {
  if (pendingUpdate) {
    clearTimeout(pendingUpdate);
    pendingUpdate = null;
  }
  emitAnswerCount(io);
}

module.exports = {
  scheduleAnswerCount,
  flushAnswerCount
};
