const router       = require('express').Router();
const supabase     = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/stats — admin only
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
