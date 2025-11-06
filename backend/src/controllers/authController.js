import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
};

export const register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
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

export const logout = async (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getAllUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true }
  });
  res.json(users);
}