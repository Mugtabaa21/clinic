const router = require('express').Router();
const supabase = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// جلب الرمز السري من ملف البيئة (أو 1234 كافتراضي)
const PIN = process.env.ADMIN_PIN || '1234';

// POST /api/reset
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { pin } = req.body;
    
    // 1. التحقق من الرمز السري
    if (!pin || pin !== PIN) {
      return res.status(401).json({ error: 'رمز الدخول غير صحيح' });
    }

    // 2. مسح جميع الحجوزات (حذف كل الصفوف)
    const { error: bookingsErr } = await supabase
      .from('bookings')
      .delete()
      .neq('id', 'dummy_value'); // شرط ينطبق على كل الصفوف
    if (bookingsErr) throw bookingsErr;

    // 3. مسح جميع الأيام المغلقة
    const { error: closedDaysErr } = await supabase
      .from('closed_days')
      .delete()
      .neq('date', 'dummy_value');
    if (closedDaysErr) throw closedDaysErr;

    // 4. تصفير الإحصائيات (العودة إلى 0 للصف الذي يحمل id=1)
    const { error: statsErr } = await supabase
      .from('stats')
      .update({
        total_ever: 0,
        attended_ever: 0,
        cancelled_ever: 0,
        first_ever: 0,
        review_ever: 0
      })
      .eq('id', 1);
    if (statsErr) throw statsErr;

    res.json({ message: 'تم مسح جميع البيانات بنجاح' });
  } catch (err) {
    console.error('Reset Error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء محاولة مسح البيانات' });
  }
});

module.exports = router;