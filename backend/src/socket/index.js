const { Server } = require('socket.io');
const registerParticipantHandlers = require('./handlers/participantHandler');
const registerHostHandlers = require('./handlers/hostHandler');
const registerScreenHandlers = require('./handlers/screenHandler');
const gameState = require('../services/gameStateManager');
const supabase = require('../config/supabase');
const env = require('../config/env');

/**
 * Initialize Socket.io and load room configuration from Supabase.
 *
 * Room structure (SRS 6.2):
 *   'game'   — All participants (receive questions, submit answers)
 *   'host'   — Host dashboard (full game state, control events)
 *   'screen' — Big screen display (display events only)
 */
async function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // TODO: restrict in production
      methods: ['GET', 'POST']
    },
    // Performance tuning for 500 concurrent connections (NFR-01)
    pingTimeout: 20000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6 // 1MB max payload
  });

  // Load room settings from Supabase on boot
  await loadRoomSettings();

  io.on('connection', (socket) => {
    console.log(`[SOCKET] New connection: ${socket.id}`);

    // Register all event handlers — each handler manages its own room joins
    registerParticipantHandlers(io, socket);
    registerHostHandlers(io, socket);
    registerScreenHandlers(io, socket);
  });

  console.log('[SOCKET] Socket.io initialized with rooms: game, host, screen');
  return io;
}

/**
 * Load room_settings from Supabase and inject into the GameStateManager.
 */
async function loadRoomSettings() {
  applyEnvironmentRoomConfig();

  if (!supabase) {
    console.warn('[SOCKET] Supabase not configured - using environment/default room settings.');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('room_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    if (data) {
      gameState.loadRoomConfig(data);
      console.log(`[SOCKET] Room settings loaded - PIN: ${data.room_pin}, Max: ${data.max_participants}, Grace: ${data.reconnect_grace_seconds}s`);
    }
  } catch (err) {
    console.error('[SOCKET] Error loading room settings:', err.message);
    console.warn('[SOCKET] Falling back to environment/default room settings.');
  }
}

/**
 * Apply deployment-local room settings before any Supabase override.
 *
 * README documents these env vars for production capacity, so they need to
 * affect the authoritative room config even when room_settings is unavailable.
 */
function applyEnvironmentRoomConfig() {
  const settings = {};

  if (env.HOST_PIN) settings.host_pin = env.HOST_PIN;
  if (env.ROOM_PIN) settings.room_pin = env.ROOM_PIN;

  const maxParticipants = Number.parseInt(env.MAX_PARTICIPANTS, 10);
  if (Number.isFinite(maxParticipants) && maxParticipants > 0) {
    settings.max_participants = maxParticipants;
  }

  const graceMs = Number.parseInt(env.REJOIN_GRACE_PERIOD_MS, 10);
  if (Number.isFinite(graceMs) && graceMs >= 0) {
    settings.reconnect_grace_seconds = Math.ceil(graceMs / 1000);
  }

  if (Object.keys(settings).length > 0) {
    gameState.loadRoomConfig(settings);
    console.log(
      `[SOCKET] Environment room settings applied - PIN: ${gameState.roomConfig.roomPin}, ` +
      `Max: ${gameState.roomConfig.maxParticipants}, ` +
      `Grace: ${gameState.roomConfig.reconnectGraceSeconds}s`
    );
  }
}

module.exports = setupSocketIO;
