import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { checkAndNotifyLowStock } from './utils/alerts.js';

import authRouter from './routes/auth.js';
import itemsRouter from './routes/items.js';
import movementsRouter from './routes/movements.js';
import analyticsRouter from './routes/analytics.js';

const app = express();

// Security + rate limit
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// Stricter CORS (whitelist via env)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/analytics', analyticsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server listening on port http://localhost:${PORT}`)
  cron.schedule('0 * * * *', async () => {
    try {
      await checkAndNotifyLowStock();
    } catch (e) {
      console.error('Low-stock job failed', e);
    }
  });
});