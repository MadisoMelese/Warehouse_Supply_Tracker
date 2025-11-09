import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

// Public routes (authenticated users)
router.get('/', authenticateJWT, getCategories);
router.get('/:id', authenticateJWT, getCategory);

// Admin only routes
router.post('/', authenticateAdmin, createCategory);
router.put('/:id', authenticateAdmin, updateCategory);
router.delete('/:id', authenticateAdmin, deleteCategory);

export default router;

