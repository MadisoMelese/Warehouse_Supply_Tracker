import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { checkAndNotifyLowStock } from './utils/alerts.js';

import authRouter from './routes/auth.js';
import itemsRouter from './routes/items.js';
import movementsRouter from './routes/movements.js';
import analyticsRouter from './routes/analytics.js';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/analytics', analyticsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server listening on port http://localhost:${PORT}`)
  // Schedule low-stock check every hour (can be changed)
  cron.schedule('0 * * * *', async () => {
    try {
      await checkAndNotifyLowStock();
    } catch (e) {
      console.error('Low-stock job failed', e);
    }
  });
});