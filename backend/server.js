'use strict';
// Suppress experimental SQLite warning
const _emit = process.emit.bind(process);
process.emit = function(name, ...args) {
  if (name === 'warning' && args[0]?.name === 'ExperimentalWarning') return false;
  return _emit(name, ...args);
};

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8787;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(['/api/auth/login', '/api/sellers/register'],
  rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/sellers',    require('./routes/sellers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/enquiries',  require('./routes/enquiries'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/locations',  require('./routes/locations'));

app.get('/api/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// ── Static frontend ───────────────────────────────────────────────────────────
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

// ── Error handlers ────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ AtPrice server running at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
