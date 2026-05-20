const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const bookingsRouter   = require('./routes/bookings');
const closedDaysRouter = require('./routes/closedDays');
const statsRouter      = require('./routes/stats');
const slotsRouter      = require('./routes/slots');
const authRouter       = require('./routes/auth');
const resetRouter      = require('./routes/reset');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'عدد كبير من المحاولات، يرجى المحاولة لاحقاً' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth',        authRouter);
app.use('/api/bookings',    bookingLimiter, bookingsRouter);
app.use('/api/closed-days', closedDaysRouter);
app.use('/api/stats',       statsRouter);
app.use('/api/slots',       slotsRouter);
app.use('/api/reset',       resetRouter);

app.get('/', (req, res) => res.json({ status: 'Clinic API running ✅' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
