const router       = require('express').Router();
const supabase     = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// ── GET /api/bookings ──────────────────────────────────────────
// Query params: date, status, search — Admin only
router.get('/', requireAdmin, async (req, res) => {
  try {
    let query = supabase.from('bookings').select('*').order('date').order('slot');

    if (req.query.date)   query = query.eq('date', req.query.date);
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.search) {
      const s = req.query.search;
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bookings/find-by-phone ───────────────────────────
// FIX: must come BEFORE /:id or Express will never reach it
// Patient looks up their booking by phone (for self-cancel)
router.get('/find-by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'رقم الجوال مطلوب' });

    const { data, error } = await supabase
      .from('bookings')
      .select('id, display_num, name, date, slot, status')
      .eq('phone', phone)
      .eq('status', 'upcoming')
      .limit(1)
      .single();

    if (error || !data) return res.status(404).json({ error: 'لا يوجد حجز نشط' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/bookings ─────────────────────────────────────────
// Public — patients book themselves
router.post('/', async (req, res) => {
  try {
    const { id, display_num, name, phone, age, visit_type, date, slot } = req.body;

    if (!name || !phone || !visit_type || !date || !slot) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }

    // Check slot not already taken
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('date', date)
      .eq('slot', slot)
      .eq('status', 'upcoming')
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'هذا الوقت محجوز بالفعل' });
    }

    // Check day is not closed
    const { data: closed } = await supabase
      .from('closed_days')
      .select('date')
      .eq('date', date)
      .limit(1);

    if (closed && closed.length > 0) {
      return res.status(409).json({ error: 'هذا اليوم مغلق' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert([{ id, display_num, name, phone, age, visit_type, date, slot, status: 'upcoming' }])
      .select()
      .single();

    if (error) throw error;

    // Update cumulative stats via RPC (the correct way)
    await supabase.rpc('increment_stats', { vtype: visit_type });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/cancel ────────────────────────────
// FIX: must come BEFORE /:id — otherwise Express reads "cancel" as the :id value
// Patient self-cancel by phone (no admin token needed)
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'رقم الجوال مطلوب' });

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .eq('phone', phone)
      .eq('status', 'upcoming')
      .single();

    if (!booking) return res.status(404).json({ error: 'لا يوجد حجز نشط بهذا الرقم' });

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id ────────────────────────────────────
// Update status: attended | cancelled | upcoming — Admin only
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['upcoming', 'attended', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'حالة غير صالحة' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // FIX: supabase.raw() does not exist in the JS SDK — use RPC functions instead
    if (status === 'attended') {
      await supabase.rpc('increment_attended');
    }
    if (status === 'cancelled') {
      await supabase.rpc('increment_cancelled');
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/bookings/:id ───────────────────────────────────
// Admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
