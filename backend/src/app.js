require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./config/socket');
const autoMigrate = require('./utils/autoMigrate');

// Run auto-migrations on startup
autoMigrate();

// Route imports
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const staffRoutes = require('./routes/staff.routes');
const teacherRoutes = require('./routes/teacher.routes');
const studentRoutes = require('./routes/student.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const noticeRoutes = require('./routes/notice.routes');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (e.g., Vercel)
const server = http.createServer(app);

// Initialize Socket.io (must come before routes so getIO() is available)
initSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// Input Sanitization
app.use(xss());
app.use(mongoSanitize());

// Trim whitespace from all string inputs
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
});

// Static files (for uploaded receipts)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV === 'production') {
  // Disable global API limiter because it blocks all users behind proxies with 429
  // app.use('/api', apiLimiter);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notices', noticeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'GSTU Portal API is running', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// ─── 24h Registration Deadline Warning Cron ───────────────────────────────────
// Runs every hour; sends a warning notification to enrolled students if their
// registration window closes within the next 24 hours.
const pool = require('./config/db');
const { sendNotification } = require('./services/notification.service');

async function checkUpcomingDeadlines() {
  try {
    const [semesters] = await pool.query(`
      SELECT s.semester_id, s.dept_id, s.reg_end, s.level, s.term, s.academic_year
      FROM semester s
      WHERE s.is_active = 1
        AND s.reg_end BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
    `);

    for (const sem of semesters) {
      // Get students enrolled in this semester who haven't been warned yet
      const [students] = await pool.query(`
        SELECT DISTINCT e.student_id
        FROM enrollment e
        JOIN course_offering co ON e.offering_id = co.offering_id
        WHERE co.semester_id = ? AND e.status = 'Registered'
          AND e.student_id NOT IN (
            SELECT COALESCE(user_id, '') FROM notifications
            WHERE title = 'Registration Closing Soon'
              AND created_at >= DATE_SUB(NOW(), INTERVAL 25 HOUR)
          )
      `, [sem.semester_id]);

      for (const row of students) {
        await sendNotification({
          userId: row.student_id,
          userType: 'student',
          title: 'Registration Closing Soon',
          message: `Registration for L${sem.level}T${sem.term} (${sem.academic_year}) closes within 24 hours. Please complete any pending registrations.`,
          type: 'warning',
          link: '/student/registration',
        });
      }

      if (students.length > 0) {
        console.log(`⏰ [Cron] Sent 24h deadline warning to ${students.length} students for semester ${sem.semester_id}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Deadline check failed:', err.message);
  }
}

// Run every hour
setInterval(checkUpcomingDeadlines, 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 GSTU Portal API running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
// force nodemon restart
