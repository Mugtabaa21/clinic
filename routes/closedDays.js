const router       = require('express').Router();
const supabase     = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/closed-days — public (frontend needs this to block dates)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('closed_days')
      .select('*')
      .order('date');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/closed-days — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'التاريخ مطلوب' });

    const { data, error } = await supabase
      .from('closed_days')
      .insert([{ date, reason: reason || 'إجازة' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/closed-days/:date — admin only
router.delete('/:date', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('closed_days')
      .delete()
      .eq('date', req.params.date);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
