const gameState = require('../services/gameStateManager');

const LOBBY_UPDATE_DEBOUNCE_MS = Number.parseInt(process.env.LOBBY_UPDATE_DEBOUNCE_MS, 10) || 500;
let pendingUpdate = null;

function buildCountPayload() {
  return {
    count: gameState.getParticipantCount(),
    roomPin: gameState.roomConfig.roomPin
  };
}

function buildFullPayload() {
  return {
    ...buildCountPayload(),
    participants: gameState.getParticipantList()
  };
}

function emitLobbyUpdate(io) {
  const countPayload = buildCountPayload();

  // Participants only need the room count/PIN while waiting. Sending the full
  // growing participant list to every participant makes mass joins O(n^2).
  io.to('game').emit('lobby:update', countPayload);
  io.to('host').to('screen').emit('lobby:update', buildFullPayload());
}

function scheduleLobbyUpdate(io) {
  if (pendingUpdate) return;

  pendingUpdate = setTimeout(() => {
    pendingUpdate = null;
    emitLobbyUpdate(io);
  }, LOBBY_UPDATE_DEBOUNCE_MS);
}

function flushLobbyUpdate(io) {
  if (pendingUpdate) {
    clearTimeout(pendingUpdate);
    pendingUpdate = null;
  }
  emitLobbyUpdate(io);
}

module.exports = {
  scheduleLobbyUpdate,
  flushLobbyUpdate
};
