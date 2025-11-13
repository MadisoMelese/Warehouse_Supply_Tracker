import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { createItem, getItems, getItem, updateItem, updateStock, deleteItem } from '../controllers/itemController.js';

const router = express.Router();

// Public routes (authenticated users)
router.get('/', authenticateJWT, getItems);

// Admin only routes - specific routes first
router.post('/', authenticateAdmin, createItem);
router.patch('/:id/stock', authenticateAdmin, updateStock); // Must be before /:id routes

// Generic routes
router.get('/:id', authenticateJWT, getItem);
router.put('/:id', authenticateAdmin, updateItem);
router.delete('/:id', authenticateAdmin, deleteItem);

export default router;