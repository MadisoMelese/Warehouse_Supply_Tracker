import express from 'express';
import { login, logout, register, getAllUsers } from '../controllers/authController.js';
import authenticateJWT from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.get('/users', authenticateJWT, getAllUsers);

export default router;