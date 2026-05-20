const PIN = process.env.ADMIN_PIN || '1234';
const SECRET = process.env.JWT_SECRET || 'clinic-secret-key';
const jwt = require('jsonwebtoken');

// POST /api/auth/login  { pin } → { token }
const router = require('express').Router();

router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || pin !== PIN) {
    return res.status(401).json({ error: 'رمز الدخول غير صحيح' });
  }
  const token = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '12h' });
  res.json({ token });
});

module.exports = router;
