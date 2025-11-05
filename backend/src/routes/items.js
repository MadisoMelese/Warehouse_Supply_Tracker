import express from 'express';
import authenticateJWT from '../middleware/auth.js';
import { createItem, getItems, getItem } from '../controllers/itemController.js';

const router = express.Router();

router.get('/', authenticateJWT, getItems);
router.get('/:id', authenticateJWT, getItem);
router.post('/', authenticateJWT, createItem);

export default router;