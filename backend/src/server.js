require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const { checkAndNotifyLowStock } = require('./utils/alerts');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/analytics', require('./routes/analytics'));

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
