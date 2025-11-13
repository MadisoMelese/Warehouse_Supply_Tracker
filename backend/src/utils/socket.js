import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    // Join admin room if user is admin
    if (socket.userRole === 'ADMIN') {
      socket.join('admins');
      console.log(`Admin ${socket.userId} joined admins room`);
    }

    // Join user-specific room for personal notifications
    socket.join(`user_${socket.userId}`);
    console.log(`User ${socket.userId} joined personal room`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

/**
 * Get the Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Emit notification to all admins
 */
export const notifyAdmins = (event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to('admins').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`Notification sent to admins: ${event}`, data);
  } catch (error) {
    // Socket.io might not be initialized yet, just log the error
    console.warn('Failed to send notification (Socket.io not initialized):', error.message);
  }
};

/**
 * Emit notification to a specific user
 */
export const notifyUser = (userId, event, data) => {
  try {
    const socketIO = getIO();
    socketIO.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`Notification sent to user ${userId}: ${event}`, data);
  } catch (error) {
    console.warn('Failed to send user notification (Socket.io not initialized):', error.message);
  }
};

