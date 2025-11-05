import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { createMovement, getMovements } from '../controllers/movementController.js';

const router = express.Router();

router.post('/', authenticateJWT, createMovement);
router.get('/', authenticateJWT, getMovements);

export default router;