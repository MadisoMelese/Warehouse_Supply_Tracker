import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
const resetExpiryMinutes = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 30);

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  if (!strongPassword.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, password: hashed } });

  res.status(201).json({ id: user.id, email: user.email, role: user.role, createdAt: user.createdAt });
};
/**
 * Create user with role - Admin only
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, role = 'USER' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    if (role && !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either USER or ADMIN' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, role }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};

/**
 * Get all users - Admin only
 * Returns list of all users with their basic information
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get user details with activity - Admin only
 */
export const getUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const requested = await prisma.movement.findMany({
      where: { requestedById: id },
      include: {
        item: { include: { category: true } },
        approvedBy: { select: { id: true, email: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    const approved = await prisma.movement.findMany({
      where: { approvedById: id },
      include: {
        item: { include: { category: true } },
        requestedBy: { select: { id: true, email: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    const stats = {
      totalRequests: requested.length,
      approved: requested.filter(m => m.status === 'APPROVED').length,
      pending: requested.filter(m => m.status === 'PENDING').length,
      rejected: requested.filter(m => m.status === 'REJECTED').length,
      returned: requested.filter(m => m.isReturned).length,
      notReturned: requested.filter(m => !m.isReturned && m.status === 'APPROVED').length
    };

    res.json({ user, activity: { requested, approved }, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Update a user (email/role/password) - Admin only
 */
export const updateUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { email, role, password } = req.body;

    const data = {};
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
      data.email = email;
    }
    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role)) return res.status(400).json({ error: 'Role must be USER or ADMIN' });
      data.role = role;
    }
    if (password !== undefined) {
      if (!strongPassword.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 chars incl uppercase, lowercase, number, special char' });
      }
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Delete a user - Admin only
 * Prevent deletion if the user has associated movement records to preserve integrity
 */
export const deleteUserById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const counts = await prisma.movement.aggregate({
      _count: true,
      where: { OR: [{ requestedById: id }, { approvedById: id }] }
    });
    if (counts._count > 0) {
      return res.status(400).json({ error: 'Cannot delete user with movement history' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + resetExpiryMinutes * 60 * 1000);

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });

      try {
        await sendPasswordResetEmail({ email: user.email, token, expiresAt });
      } catch (emailErr) {
        console.error('Failed to send password reset email', emailErr);
      }
    }

    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error('Password reset request failed', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 chars and include uppercase, lowercase, number, and special character'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed }
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { used: true, usedAt: new Date() }
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          used: false
        }
      })
    ]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset failed', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};