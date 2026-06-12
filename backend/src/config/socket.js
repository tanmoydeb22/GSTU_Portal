const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io on the HTTP server.
 * Called once from app.js after creating the http.Server.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT authentication middleware for socket handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role, deptId } = socket.user;

    // Personal room — for direct notifications
    socket.join(`user:${userId}`);

    // Role room — for role-wide broadcasts
    socket.join(`role:${role}`);

    // Dept+role room — for dept-specific role broadcasts (e.g. all students in dept 1)
    if (deptId) socket.join(`dept:${deptId}:role:${role}`);

    // Global room — for admin→all broadcasts
    socket.join('role:all');

    console.log(`🔌 [Socket] Connected: ${userId} | role:${role} | dept:${deptId || 'N/A'}`);

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket] Disconnected: ${userId}`);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}

/**
 * Returns the initialized Socket.io instance.
 * Safe to call after initSocket(); falls back gracefully if called before init.
 */
function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
