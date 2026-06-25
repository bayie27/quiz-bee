const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');


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

module.exports = router;
