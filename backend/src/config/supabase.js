const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey && /^https?:\/\//.test(supabaseUrl)) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[SUPABASE] Client initialized successfully');
} else {
  console.warn('[SUPABASE] URL or Key is missing/invalid. Running without DB connection.');
}

module.exports = supabase;
