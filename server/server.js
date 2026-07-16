// server/server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const connectDB = require('./config/db');

// Fail fast in production if the JWT secret is missing; never fall back to a
// hardcoded secret outside local development.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable must be set in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-only-insecure-secret';
  console.warn('JWT_SECRET not set — using an insecure development-only secret.');
}

const app = express();

// Render (and most PaaS hosts) terminate TLS at a proxy.
app.set('trust proxy', 1);

connectDB();

// CLIENT_ORIGIN is a comma-separated list of allowed origins,
// e.g. "https://your-app.vercel.app,http://localhost:5173"
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check for Render
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const requireAuth = require('./middleware/auth');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/chatbot', requireAuth, require('./routes/chatbot'));
app.use('/api/campaign', requireAuth, require('./routes/campaign'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
