const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { createMovement, getMovements } = require('../controllers/movementController');

router.post('/', authenticateJWT, createMovement);
router.get('/', authenticateJWT, getMovements);

module.exports = router;
