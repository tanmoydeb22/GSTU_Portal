import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';

let socket = null;

/**
 * Derive the canonical userId string from the user object based on role.
 * This must match what the backend JWT payload `userId` field contains.
 */
function resolveUserId(user, role) {
  if (!user || !role) return null;
  if (role === 'student')    return user.student_id;
  if (role === 'teacher')    return user.teacher_code;
  if (role === 'dept_staff') return user.staff_code;
  if (role === 'admin')      return String(user.admin_id || user.email);
  return null;
}

/**
 * Returns (and lazily creates) the singleton Socket.io connection.
 * Must only be called when the user is authenticated.
 */
export function getSocket() {
  if (socket?.connected) return socket;

  const { accessToken, user, role } = useAuthStore.getState();
  if (!accessToken || !user) return null;

  const userId = resolveUserId(user, role);

  socket = io('http://localhost:5001', {
    auth: { token: accessToken },
    query: { userId, role, deptId: user.dept_id || null },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect and destroy the socket singleton.
 * Called on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
