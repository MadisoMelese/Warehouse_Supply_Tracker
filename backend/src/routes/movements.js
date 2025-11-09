import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import {
  requestMovement,
  getMovements,
  getMovement,
  approveMovement,
  rejectMovement,
  returnItem
} from '../controllers/movementController.js';

const router = express.Router();

// User routes
router.post('/', authenticateJWT, requestMovement);
router.get('/', authenticateJWT, getMovements);
router.get('/:id', authenticateJWT, getMovement);
router.post('/:id/return', authenticateJWT, returnItem);

// Admin only routes
router.post('/:id/approve', authenticateAdmin, approveMovement);
router.post('/:id/reject', authenticateAdmin, rejectMovement);

export default router;