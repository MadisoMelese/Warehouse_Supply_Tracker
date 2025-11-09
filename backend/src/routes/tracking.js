import express from 'express';
import { authenticateAdmin } from '../middleware/admin.js';
import {
  getItemAssignments,
  getUserActivitySummary,
  getPendingRequests
} from '../controllers/trackingController.js';

const router = express.Router();

// All tracking routes are admin only
router.get('/assignments', authenticateAdmin, getItemAssignments);
router.get('/user-activity', authenticateAdmin, getUserActivitySummary);
router.get('/pending-requests', authenticateAdmin, getPendingRequests);

export default router;

