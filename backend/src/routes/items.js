import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { createItem, getItems, getItem, updateItem, deleteItem } from '../controllers/itemController.js';

const router = express.Router();

router.get('/', authenticateJWT, getItems);
router.post('/', authenticateJWT, createItem);
router.get('/:id', authenticateJWT, getItem);
router.put('/:id', authenticateJWT, updateItem);
router.delete('/:id', authenticateJWT, deleteItem);

export default router;