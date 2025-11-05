import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { stockPerItem, movementsTrend } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/stock-per-item', authenticateJWT, stockPerItem);
router.get('/movements-trend', authenticateJWT, movementsTrend);

export default router;