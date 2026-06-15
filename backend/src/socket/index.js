const { Server } = require('socket.io');
const registerParticipantHandlers = require('./handlers/participantHandler');
const registerHostHandlers = require('./handlers/hostHandler');
const registerScreenHandlers = require('./handlers/screenHandler');
const gameState = require('../services/gameStateManager');
const supabase = require('../config/supabase');

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
  if (!supabase) {
    console.warn('[SOCKET] Supabase not configured — using default room settings.');
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
      console.log(`[SOCKET] Room settings loaded — PIN: ${data.room_pin}, Max: ${data.max_participants}, Grace: ${data.reconnect_grace_seconds}s`);
    }
  } catch (err) {
    console.error('[SOCKET] Error loading room settings:', err.message);
    console.warn('[SOCKET] Falling back to default room settings.');
  }
}

module.exports = setupSocketIO;
