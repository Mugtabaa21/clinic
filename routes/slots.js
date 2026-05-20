const router   = require('express').Router();
const supabase = require('../db');

// All clinic time slots — must match what's in your frontend
const ALL_SLOTS = [
  '9:00 ص','9:30 ص','10:00 ص','10:30 ص','11:00 ص','11:30 ص',
  '12:00 م','12:30 م','1:00 م','1:30 م','2:00 م','2:30 م',
  '3:00 م','3:30 م','4:00 م','4:30 م','5:00 م','5:30 م'
];

// GET /api/slots?date=YYYY-MM-DD
// Returns each slot with availability status — public
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'التاريخ مطلوب' });

    // Check if day is closed
    const { data: closed } = await supabase
      .from('closed_days')
      .select('date')
      .eq('date', date)
      .limit(1);

    if (closed && closed.length > 0) {
      return res.json({ closed: true, slots: [] });
    }

    // Get taken slots for that date
    const { data: taken, error } = await supabase
      .from('bookings')
      .select('slot')
      .eq('date', date)
      .eq('status', 'upcoming');

    if (error) throw error;

    const takenSet = new Set((taken || []).map(b => b.slot));

    const slots = ALL_SLOTS.map(slot => ({
      slot,
      available: !takenSet.has(slot)
    }));

    res.json({ closed: false, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
