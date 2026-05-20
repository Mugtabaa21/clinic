const jwt = require('jsonwebtoken');

// FIX: crash loudly on startup if JWT_SECRET is not set
// A missing secret means anyone can forge admin tokens — must not silently fallback
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start safely.');
}

const SECRET = process.env.JWT_SECRET;

module.exports = function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  const token = header.slice(7);
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
  }
};
