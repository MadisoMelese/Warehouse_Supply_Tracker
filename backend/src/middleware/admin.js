import authenticateJWT from './auth.js';

/**
 * Middleware to check if user has admin role
 * Must be used after authenticateJWT middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Combined middleware: authenticate + require admin
 * Usage: router.get('/path', authenticateAdmin, handler)
 */
const authenticateAdmin = (req, res, next) => {
  // First authenticate
  authenticateJWT(req, res, () => {
    // Then check admin role
    requireAdmin(req, res, next);
  });
};

export default requireAdmin;
export { authenticateAdmin };

