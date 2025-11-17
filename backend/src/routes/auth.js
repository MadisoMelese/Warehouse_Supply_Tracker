import express from 'express';
import {
  login,
  logout,
  register,
  getAllUsers,
  createUser,
  getUserById,
  updateUserById,
  deleteUserById,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController.js';
import authenticateJWT from '../middleware/auth.js';
import { authenticateAdmin } from '../middleware/admin.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Only admin can get all users
router.post('/create-user', authenticateAdmin, createUser);
router.get('/users', authenticateAdmin, getAllUsers);
router.get('/users/:id', authenticateAdmin, getUserById);
router.put('/users/:id', authenticateAdmin, updateUserById);
router.delete('/users/:id', authenticateAdmin, deleteUserById);

export default router;