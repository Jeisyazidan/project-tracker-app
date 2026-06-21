require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const { startReminderCron } = require('./services/reminder');

const app = express();

app.use(cors({
  origin:      process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/projects',require('./routes/projects'));
app.use('/api/bast',    require('./routes/bast'));
app.use('/api/cm',      require('./routes/cm'));
app.use('/api/pm',      require('./routes/pm'));
app.use('/api/users',   require('./routes/users'));
app.use('/api/config',    require('./routes/config'));
app.use('/api/reminders', require('./routes/reminders'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  startReminderCron();
});

module.exports = app;
