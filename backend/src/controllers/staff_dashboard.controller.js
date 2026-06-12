const pool = require('../config/db');
const { success, badRequest } = require('../utils/response');

async function getDashboardStats(req, res, next) {
  try {
    const deptId = req.user.deptId;
    
    // Total Students
    const [students] = await pool.query('SELECT COUNT(*) as cnt FROM student WHERE dept_id=? AND is_active=1', [deptId]);
    
    // Active Semester
    const [activeSem] = await pool.query('SELECT semester_id, academic_year, level, term, reg_start, reg_end FROM semester WHERE dept_id=? AND is_active=1 LIMIT 1', [deptId]);
    
    // Pending Grade Submissions (Courses in active semester where enrolled students have no grade)
    let pendingGrades = 0;
    // Unpaid Payments
    let unpaidPayments = 0;
    // TBA Courses
    let tbaCourses = 0;

    if (activeSem.length > 0) {
      const s = activeSem[0];
      const [grades] = await pool.query(`
        SELECT COUNT(DISTINCT co.offering_id) as cnt
        FROM course_offering co
        JOIN enrollment e ON co.offering_id = e.offering_id
        WHERE co.semester_id = ? AND e.grade_point IS NULL
      `, [s.semester_id]);
      pendingGrades = grades[0].cnt;

      const [payments] = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM payment
        WHERE semester_id = ? AND status = 'Pending'
      `, [s.semester_id]);
      unpaidPayments = payments[0].cnt;

      const [tba] = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM course_offering
        WHERE semester_id = ? AND teacher_id IS NULL
      `, [s.semester_id]);
      tbaCourses = tba[0].cnt;
    }

    return success(res, {
      totalStudents: students[0].cnt,
      activeSemester: activeSem.length ? activeSem[0] : null,
      pendingGrades,
      unpaidPayments,
      tbaCourses
    });
  } catch (err) { next(err); }
}

async function getDashboardPendingTasks(req, res, next) {
  try {
    const deptId = req.user.deptId;
    const tasks = [];

    const [activeSem] = await pool.query('SELECT semester_id, reg_end FROM semester WHERE dept_id=? AND is_active=1 LIMIT 1', [deptId]);
    if (activeSem.length > 0) {
      const s = activeSem[0];

      // 1. Grade entry pending
      const [pendingGrades] = await pool.query(`
        SELECT c.course_code, COUNT(e.enrollment_id) as stud_count, co.offering_id
        FROM course_offering co
        JOIN course c ON co.course_id = c.course_id
        JOIN enrollment e ON co.offering_id = e.offering_id
        WHERE co.semester_id = ? AND e.grade_point IS NULL
        GROUP BY co.offering_id
      `, [s.semester_id]);
      
      pendingGrades.forEach(g => {
        tasks.push({
          type: 'grade_pending',
          label: `${g.course_code}: Grade entry pending (${g.stud_count} stud.)`,
          action: 'Enter Grades',
          link: `/staff/courses`, // Or specific course grade page
          severity: 'red'
        });
      });

      // 2. No teacher assigned
      const [tba] = await pool.query(`
        SELECT c.course_code, co.offering_id
        FROM course_offering co
        JOIN course c ON co.course_id = c.course_id
        WHERE co.semester_id = ? AND co.teacher_id IS NULL
      `, [s.semester_id]);

      tba.forEach(t => {
        tasks.push({
          type: 'tba_course',
          label: `${t.course_code}: No teacher assigned`,
          action: 'Assign',
          link: '/staff/courses',
          severity: 'red'
        });
      });

      // 3. Unpaid payments
      const [unpaid] = await pool.query(`
        SELECT COUNT(*) as cnt
        FROM payment
        WHERE semester_id = ? AND status = 'Pending'
      `, [s.semester_id]);

      if (unpaid[0].cnt > 0) {
        tasks.push({
          type: 'unpaid',
          label: `${unpaid[0].cnt} students haven't paid yet`,
          action: 'View',
          link: '/staff/students',
          severity: 'yellow'
        });
      }

      // 4. Registration countdown
      if (s.reg_end) {
        const daysLeft = Math.ceil((new Date(s.reg_end) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) {
          tasks.push({
            type: 'reg_close',
            label: `Registration closes in ${daysLeft} days`,
            action: 'Manage',
            link: '/staff/dashboard',
            severity: 'yellow'
          });
        }
      }
    }

    return success(res, tasks);
  } catch (err) { next(err); }
}

async function getDashboardCgpaDistribution(req, res, next) {
  try {
    const deptId = req.user.deptId;
    const [students] = await pool.query('SELECT cgpa FROM student WHERE dept_id=? AND is_active=1', [deptId]);
    
    let ranges = {
      '0-1': 0,
      '1-2': 0,
      '2-3': 0,
      '3-3.5': 0,
      '3.5-4': 0
    };

    students.forEach(s => {
      const cgpa = parseFloat(s.cgpa) || 0;
      if (cgpa < 1) ranges['0-1']++;
      else if (cgpa < 2) ranges['1-2']++;
      else if (cgpa < 3) ranges['2-3']++;
      else if (cgpa < 3.5) ranges['3-3.5']++;
      else ranges['3.5-4']++;
    });

    const data = [
      { name: '0-1.0', count: ranges['0-1'] },
      { name: '1.0-2.0', count: ranges['1-2'] },
      { name: '2.0-3.0', count: ranges['2-3'] },
      { name: '3.0-3.5', count: ranges['3-3.5'] },
      { name: '3.5-4.0', count: ranges['3.5-4'] }
    ];

    return success(res, data);
  } catch (err) { next(err); }
}

async function getDashboardPaymentStatus(req, res, next) {
  try {
    const deptId = req.user.deptId;
    const [activeSem] = await pool.query('SELECT semester_id FROM semester WHERE dept_id=? AND is_active=1 LIMIT 1', [deptId]);
    
    let data = [
      { name: 'Paid', value: 0 },
      { name: 'Pending', value: 0 },
      { name: 'Unpaid', value: 0 }
    ];

    if (activeSem.length > 0) {
      const [payments] = await pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM payment
        WHERE semester_id = ?
        GROUP BY status
      `, [activeSem[0].semester_id]);

      payments.forEach(p => {
        if (p.status === 'Paid') data[0].value += p.cnt;
        else if (p.status === 'Pending') data[1].value += p.cnt;
        else if (p.status === 'Unpaid' || p.status === 'Rejected' || p.status === 'Failed') data[2].value += p.cnt;
      });
    }

    return success(res, data);
  } catch (err) { next(err); }
}

async function getDashboardRecentActivity(req, res, next) {
  try {
    const deptId = req.user.deptId;
    
    // Fake recent activity for now, constructing from database records
    const [students] = await pool.query('SELECT student_id, name, created_at FROM student WHERE dept_id=? ORDER BY created_at DESC LIMIT 5', [deptId]);
    
    let feed = [];
    
    students.forEach(s => {
      feed.push({
        id: `stud-${s.student_id}`,
        text: `Student added: ${s.student_id} - ${s.name}`,
        time: s.created_at,
        type: 'student'
      });
    });

    const [activeSem] = await pool.query('SELECT academic_year, level, term, reg_start FROM semester WHERE dept_id=? AND is_active=1 LIMIT 1', [deptId]);
    if (activeSem.length > 0) {
      feed.push({
        id: `sem-${activeSem[0].level}-${activeSem[0].term}`,
        text: `Semester ${activeSem[0].academic_year} (L${activeSem[0].level}T${activeSem[0].term}) opened for registration`,
        time: activeSem[0].reg_start || new Date(),
        type: 'semester'
      });
    }

    feed.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return success(res, feed.slice(0, 10));
  } catch (err) { next(err); }
}

module.exports = {
  getDashboardStats,
  getDashboardPendingTasks,
  getDashboardCgpaDistribution,
  getDashboardPaymentStatus,
  getDashboardRecentActivity
};
