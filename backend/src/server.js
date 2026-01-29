import 'dotenv/config';
import express from 'express';
import http from 'http';
// import cors from 'cors';
// import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { checkAndNotifyLowStock } from './utils/alerts.js';
import { initializeSocket } from './utils/socket.js';

import authRouter from './routes/auth.js';
import itemsRouter from './routes/items.js';
import movementsRouter from './routes/movements.js';
import analyticsRouter from './routes/analytics.js';
import categoriesRouter from './routes/categories.js';
import trackingRouter from './routes/tracking.js';
import { authenticateAdmin } from './middleware/admin.js';
import { sendEmail } from './utils/mailer.js';

const app = express();
const httpServer = http.createServer(app);

// Security + rate limit
// app.set('trust proxy', 1);
// app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Stricter CORS (whitelist via env)
// const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
// const corsOptions = {
//   origin: (origin, cb) => {
//     if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
//     cb(new Error('Not allowed by CORS'));
//   },
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// };
// app.use(cors(corsOptions));

app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tracking', trackingRouter);

const PORT = process.env.PORT || 4000;

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`Server listening on port http://localhost:${PORT}`)
  console.log(`Socket.io initialized`);

  // Dev convenience: run once on startup so you can see logs immediately
  try {
    await checkAndNotifyLowStock();
  } catch (e) {
    console.error('Initial low-stock check failed', e);
  }

  cron.schedule('0 * * * *', async () => {
    try {
      await checkAndNotifyLowStock();
    } catch (e) {
      console.error('Low-stock job failed', e);
    }
  });
});

// Admin-only manual trigger
app.post('/api/alerts/run-low-stock-check', authenticateAdmin, async (req, res) => {
  try {
    await checkAndNotifyLowStock();
    res.json({ message: 'Low-stock check executed' });
  } catch (e) {
    console.error('Manual low-stock check failed', e);
    res.status(500).json({ error: 'Low-stock check failed' });
  }
});

// Admin-only: send a direct email message
app.post('/api/messages/send', authenticateAdmin, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'to, subject, and (text or html) are required' });
    }
    const result = await sendEmail({ to, subject, text, html });
    res.json(result);
  } catch (e) {
    console.error('Failed to send message', e);
    res.status(500).json({ error: e.message || 'Failed to send message' });
  }
});
