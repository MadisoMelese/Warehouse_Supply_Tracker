import express from 'express';
import { login, logout, register, getAllUsers, createUser } from '../controllers/authController.js';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.post('/create-user', authenticateAdmin, createUser);
// Only admin can get all users
router.get('/users', authenticateAdmin, getAllUsers);

export default router;