require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  HOST_PIN: process.env.HOST_PIN,
  ROOM_PIN: process.env.ROOM_PIN,
  MAX_PARTICIPANTS: process.env.MAX_PARTICIPANTS,
  REJOIN_GRACE_PERIOD_MS: process.env.REJOIN_GRACE_PERIOD_MS,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
};
