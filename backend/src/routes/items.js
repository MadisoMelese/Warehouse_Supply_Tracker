import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import { createItem, getItems, getItem, updateItem, deleteItem } from '../controllers/itemController.js';

const router = express.Router();

// Public routes (authenticated users)
router.get('/', authenticateJWT, getItems);
router.get('/:id', authenticateJWT, getItem);

// Admin only routes
router.post('/', authenticateAdmin, createItem);
router.put('/:id', authenticateAdmin, updateItem);
router.delete('/:id', authenticateAdmin, deleteItem);

export default router;