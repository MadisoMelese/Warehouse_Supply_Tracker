const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { stockPerItem, movementsTrend } = require('../controllers/analyticsController');

router.get('/stock-per-item', authenticateJWT, stockPerItem);
router.get('/movements-trend', authenticateJWT, movementsTrend);

module.exports = router;
