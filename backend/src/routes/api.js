const express = require('express');
const multer = require('multer');
const router = express.Router();
const supabase = require('../config/supabase');

const upload = multer({ storage: multer.memoryStorage() });

// --- QUESTION SETS ---

router.get('/question-sets', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { data, error } = await supabase.from('question_sets').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/question-sets', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { name, scoring_config } = req.body;
  const { data, error } = await supabase
    .from('question_sets')
    .insert([{ name, scoring_config }])
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- QUESTIONS ---

router.get('/questions/:setId', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('question_set_id', req.params.setId)
    .order('order_index', { ascending: true });
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/questions/:setId', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { questions } = req.body; // Expect array of questions
  const setId = req.params.setId;

  // For simplicity, delete existing and insert new (bulk update)
  const { error: delError } = await supabase.from('questions').delete().eq('question_set_id', setId);
  if (delError) return res.status(500).json({ error: delError.message });

  if (!questions || questions.length === 0) {
    return res.json([]);
  }

  const toInsert = questions.map((q, idx) => ({
    question_set_id: setId,
    order_index: idx + 1,
    type: q.type,
    text: q.text,
    options: q.options || null,
    correct_answer: q.correct_answer,
    timer_seconds: q.timer_seconds || 30,
    image_url: q.image_url || null
  }));

  const { data, error } = await supabase.from('questions').insert(toInsert).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- BRANDING ---

router.get('/branding', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { data, error } = await supabase.from('branding').select('*').limit(1).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || {});
});

router.put('/branding', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { id, event_name, primary_color_hex, accent_color_hex, logo_url } = req.body;
  
  let result;
  if (id) {
    result = await supabase.from('branding').update({ event_name, primary_color_hex, accent_color_hex, logo_url }).eq('id', id).select().single();
  } else {
    result = await supabase.from('branding').insert([{ event_name, primary_color_hex, accent_color_hex, logo_url }]).select().single();
  }

  if (result.error) return res.status(500).json({ error: result.error.message });
  res.json(result.data);
});

// Logo upload route (Multer + Supabase Storage)
router.post('/branding/logo', upload.single('logo'), async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileExt = req.file.originalname.split('.').pop();
  const fileName = `logo-${Date.now()}.${fileExt}`;
  const filePath = `branding/${fileName}`;

  const { data, error } = await supabase.storage
    .from('assets') // Ensure this bucket exists in Supabase
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true
    });

  if (error) return res.status(500).json({ error: error.message });

  // Get public URL
  const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(filePath);

  res.json({ url: publicUrlData.publicUrl });
});

module.exports = router;
