const pool = require('../config/db');
const { success, error, badRequest, notFound } = require('../utils/response');
const { generateTranscriptPDF } = require('../services/transcript.service');
const { attachSchedules } = require('../services/schedule.service');

async function getDashboard(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [student] = await pool.query('SELECT student_id, name, email, level, term, cgpa, total_credit_completed, dept_id, batch, session, guardian_name FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res);
    const s = student[0];

    const [semester] = await pool.query('SELECT * FROM semester WHERE dept_id=? AND level=? AND term=? AND is_active=1', [s.dept_id, s.level, s.term]);
    const [dept] = await pool.query('SELECT dept_code, dept_name FROM department WHERE dept_id=?', [s.dept_id]);

    const [currentCourses] = await pool.query(`
      SELECT e.enrollment_id, c.course_code, c.course_name, c.credit, c.course_type,
        t.name AS teacher_name, e.grade_point, e.grade_letter, e.status, co.offering_id
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id LEFT JOIN teacher t ON co.teacher_id=t.teacher_id
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND sem.level=? AND sem.term=?
    `, [studentId, s.level, s.term]);
    await attachSchedules(currentCourses);

    const [gpaHistory] = await pool.query(`
      SELECT sem.academic_year, sem.level, sem.term,
        ROUND(SUM(e.grade_point * c.credit) / NULLIF(SUM(c.credit), 0), 3) AS term_gpa, SUM(c.credit) AS term_credits
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND e.status='Completed' AND e.grade_point IS NOT NULL AND sem.result_status='Published'
      GROUP BY sem.semester_id, sem.academic_year, sem.level, sem.term
      ORDER BY sem.level, sem.term
    `, [studentId]);

    let paymentStatus = 'Not Paid';
    if (semester.length) {
      const [payments] = await pool.query('SELECT status FROM payment WHERE student_id=? AND semester_id=? ORDER BY created_at DESC LIMIT 1', [studentId, semester[0].semester_id]);
      if (payments.length) {
        paymentStatus = payments[0].status; // 'Pending', 'Paid', or 'Rejected'
      }
    }

    let lastLogin = null;
    if (req.user && req.user.sessionId) {
      const [sessions] = await pool.query(
        'SELECT ip_address, user_agent, last_active FROM active_sessions WHERE user_id=? AND session_id != ? ORDER BY last_active DESC LIMIT 1',
        [studentId, req.user.sessionId]
      );
      if (sessions.length) lastLogin = sessions[0];
    }

    return success(res, {
      student: { ...s, dept_code: dept[0]?.dept_code, dept_name: dept[0]?.dept_name },
      activeSemester: semester[0] || null,
      currentCourses,
      gpaHistory,
      isRegistered: currentCourses.length > 0,
      isPaid: paymentStatus === 'Paid',
      paymentStatus: paymentStatus,
      lastLogin
    });
  } catch (err) { next(err); }
}

async function getAvailableCourses(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [student] = await pool.query('SELECT * FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res);
    const s = student[0];

    const [semester] = await pool.query('SELECT * FROM semester WHERE dept_id=? AND level=? AND term=? AND is_active=1', [s.dept_id, s.level, s.term]);
    if (!semester.length) return success(res, { isRegistrationOpen: false, semester: null, courses: [], isRegistered: false });
    const sem = semester[0];

    const [existing] = await pool.query(`
      SELECT COUNT(*) as count FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.semester_id = ? AND e.status != 'Dropped'
    `, [studentId, sem.semester_id]);
    const isRegistered = existing[0].count > 0;

    const [courses] = await pool.query(`
      SELECT co.offering_id, c.course_id, c.course_code, c.course_name, c.credit, c.course_type,
        t.name AS teacher_name
      FROM course_offering co JOIN course c ON co.course_id=c.course_id LEFT JOIN teacher t ON co.teacher_id=t.teacher_id
      WHERE co.semester_id=?
      ORDER BY c.course_code
    `, [sem.semester_id]);
    await attachSchedules(courses);

    return success(res, {
      isRegistrationOpen: true,
      semester: sem,
      courses: courses,
      isRegistered: isRegistered
    });
  } catch (err) { next(err); }
}

async function enroll(req, res, next) {
  try {
    const studentId = req.user.userId;

    const [student] = await pool.query('SELECT * FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res, 'Student not found');
    const s = student[0];

    const [semester] = await pool.query(`
      SELECT * FROM semester
      WHERE dept_id = ? AND level = ? AND term = ? AND is_active = 1
    `, [s.dept_id, s.level, s.term]);

    if (!semester.length) return badRequest(res, 'No active registration period for your department.');
    const sem = semester[0];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (todayStr < sem.reg_start || todayStr > sem.reg_end) return badRequest(res, 'Registration window has passed');

    const [existing] = await pool.query(`
      SELECT COUNT(*) as count FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.semester_id = ? AND e.status != 'Dropped'
    `, [studentId, sem.semester_id]);

    if (existing[0].count > 0) return badRequest(res, 'You are already registered for this semester.');

    const [offerings] = await pool.query(`
      SELECT co.offering_id, c.credit
      FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      WHERE co.semester_id = ?
    `, [sem.semester_id]);

    if (!offerings.length) return badRequest(res, 'No courses available for this semester yet.');

    const enrollValues = offerings.map(o => [
      studentId,
      o.offering_id,
      s.level,
      s.term,
      'Regular',
      'Registered'
    ]);

    await pool.query(`
      INSERT INTO enrollment
        (student_id, offering_id, level, term, enrollment_type, status)
      VALUES ?
    `, [enrollValues]);

    return success(res, { courses_enrolled: offerings.length }, `Successfully registered for ${offerings.length} courses.`);
  } catch (err) { next(err); }
}

async function dropCourse(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [enrollment] = await pool.query(`
      SELECT e.*, sem.is_active, sem.reg_start, sem.reg_end FROM enrollment e
      JOIN course_offering co ON e.offering_id=co.offering_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.enrollment_id=? AND e.student_id=?
    `, [req.params.enrollmentId, studentId]);
    if (!enrollment.length) return notFound(res);
    const e = enrollment[0];
    if (!e.is_active) return badRequest(res, 'Cannot drop: semester closed');
    const now = new Date();
    if (now > new Date(e.reg_end)) return badRequest(res, 'Registration window passed');

    // Rule 5: Block dropping Regular (mandatory) courses
    if (e.enrollment_type === 'Regular') {
      return badRequest(res, 'Regular courses are mandatory and cannot be dropped.');
    }

    await pool.query("UPDATE enrollment SET status='Dropped' WHERE enrollment_id=?", [req.params.enrollmentId]);
    return success(res, null, 'Course dropped');
  } catch (err) { next(err); }
}

async function getEnrollments(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, c.course_code, c.course_name, c.credit, t.name AS teacher_name,
        sem.academic_year, sem.level AS sem_level, sem.term AS sem_term, co.offering_id
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id LEFT JOIN teacher t ON co.teacher_id=t.teacher_id
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND sem.is_active=1 AND e.status='Registered'
      ORDER BY c.course_code
    `, [req.user.userId]);
    await attachSchedules(rows);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getTranscript(req, res, next) {
  try {
    const [student] = await pool.query('SELECT s.*, d.dept_code, d.dept_name FROM student s JOIN department d ON s.dept_id=d.dept_id WHERE s.student_id=?', [req.user.userId]);
    if (!student.length) return notFound(res);
    const { password: _, ...studentData } = student[0];

    const [records] = await pool.query(`
      SELECT e.enrollment_id, e.grade_point, e.grade_letter, e.status, e.enrollment_type, e.attempt_number, e.retake_of, e.is_published,
        c.course_id, c.course_code, c.course_name, c.credit,
        sem.semester_id, sem.academic_year, sem.level, sem.term
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND e.status='Completed'
      ORDER BY sem.level, sem.term, c.course_code, e.attempt_number
    `, [req.user.userId]);

    return success(res, { student: studentData, records });
  } catch (err) { next(err); }
}

async function getCGPA(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT cgpa, total_credit_completed FROM student WHERE student_id=?', [req.user.userId]);
    if (!rows.length) return notFound(res);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function getGraduationStatus(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [studentRows] = await pool.query('SELECT student_id, cgpa, session, level, term FROM student WHERE student_id=?', [studentId]);
    if (!studentRows.length) return notFound(res);
    const s = studentRows[0];

    const MIN_CGPA = 2.00;
    
    // Fetch all enrollments (completed and registered) to analyze progress
    const [enrollments] = await pool.query(`
      SELECT e.grade_point, e.status, c.course_code, c.course_name, sem.level, sem.term
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE e.student_id = ?
      ORDER BY sem.level, sem.term
    `, [studentId]);

    // Calculate level progress
    // Initialize standard 8 semesters (L1T1 to L4T2)
    const levelProgressMap = {};
    for (let l = 1; l <= 4; l++) {
      for (let t = 1; t <= 2; t++) {
        levelProgressMap[`${l}-${t}`] = { level: l, term: t, status: 'upcoming', is_complete: false };
      }
    }
    
    // Find all failed courses that have not been successfully retaken
    const coursesMap = {};
    
    enrollments.forEach(e => {
      const semKey = `${e.level}-${e.term}`;
      
      // Update Level Progress Map for completed courses
      if (e.status === 'Completed') {
        if (levelProgressMap[semKey]) {
          levelProgressMap[semKey].status = 'completed'; // Mark as completed if any completed course exists
          levelProgressMap[semKey].is_complete = true;
        }
      } else if (e.status === 'Registered') {
        if (levelProgressMap[semKey] && levelProgressMap[semKey].status === 'upcoming') {
          levelProgressMap[semKey].status = 'current';
        }
      }

      // Track failures
      if (!coursesMap[e.course_code]) {
        coursesMap[e.course_code] = { failed: false, retaken: false, course_name: e.course_name, failed_in: `Level ${e.level} Term ${e.term}` };
      }
      
      if (e.status === 'Completed' && e.grade_point === 0) {
        coursesMap[e.course_code].failed = true;
      } else if ((e.status === 'Completed' && e.grade_point > 0) || e.status === 'Registered') {
        coursesMap[e.course_code].retaken = true;
      }
    });

    const failed_courses = [];
    Object.keys(coursesMap).forEach(code => {
      const c = coursesMap[code];
      if (c.failed && !c.retaken) {
        failed_courses.push({
          course_code: code,
          course_name: c.course_name,
          failed_in: c.failed_in,
          retaken: false
        });
      }
    });

    // Format level progress
    const level_progress = [];
    let completed_semesters_count = 0;
    for (let l = 1; l <= 4; l++) {
      for (let t = 1; t <= 2; t++) {
        const sem = levelProgressMap[`${l}-${t}`];
        
        if (sem.is_complete) completed_semesters_count++;
        
        // Update status for current/upcoming based on student's current level/term
        if (sem.status === 'upcoming' && l === s.level && t === s.term) {
           sem.status = 'current';
        }
        
        level_progress.push({
          level: sem.level,
          term: sem.term,
          status: sem.status,
          is_complete: sem.is_complete
        });
      }
    }

    const cgpa = s.cgpa || 0;
    const is_cgpa_eligible = cgpa >= MIN_CGPA;
    
    const graduation_blockers = [];
    if (!is_cgpa_eligible) graduation_blockers.push(`CGPA is below required minimum (${MIN_CGPA})`);
    if (failed_courses.length > 0) graduation_blockers.push(`${failed_courses.length} course(s) with F grade not yet retaken`);
    if (completed_semesters_count < 8) graduation_blockers.push(`Only ${completed_semesters_count}/8 semesters completed`);
    
    const graduation_eligible = graduation_blockers.length === 0;

    let estimated_graduation = 'Unknown';
    if (s.session) {
      const admissionYear = parseInt(s.session.split('-')[0]);
      if (!isNaN(admissionYear)) {
        estimated_graduation = (admissionYear + 4).toString();
      }
    }

    return success(res, {
      student_id: s.student_id,
      cgpa,
      is_cgpa_eligible,
      completed_semesters_count,
      total_semesters_required: 8,
      failed_courses,
      level_progress,
      graduation_eligible,
      graduation_blockers,
      estimated_graduation
    });
  } catch (err) { next(err); }
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT s.student_id, s.name, s.email, s.phone, s.address, s.batch, s.session, s.level, s.term, s.cgpa, s.total_credit_completed, s.photo_url, s.permanent_address, s.guardian_name, s.guardian_phone, s.guardian_relation, s.blood_group, s.created_at, d.dept_code, d.dept_name FROM student s JOIN department d ON s.dept_id=d.dept_id WHERE s.student_id=?', [req.user.userId]);
    if (!rows.length) return notFound(res);
    const profile = rows[0];

    const [gpaHistory] = await pool.query(`
      SELECT sem.academic_year, sem.level, sem.term,
        ROUND(SUM(e.grade_point * c.credit) / NULLIF(SUM(c.credit), 0), 3) AS term_gpa
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND e.status='Completed' AND e.grade_point IS NOT NULL
      GROUP BY sem.semester_id, sem.academic_year, sem.level, sem.term
      HAVING MIN(e.is_published) = 1
      ORDER BY sem.level, sem.term
    `, [req.user.userId]);

    const bestGPA = gpaHistory.length > 0 ? Math.max(...gpaHistory.map(g => parseFloat(g.term_gpa))) : 0;
    
    const [coursesStats] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN grade_point > 0 THEN 1 END) as passed_courses,
        COUNT(*) as total_completed_courses,
        COUNT(CASE WHEN grade_point = 0 THEN 1 END) as failed_courses
      FROM enrollment WHERE student_id=? AND status='Completed'
    `, [req.user.userId]);

    const quick_stats = {
      gpa_trend: gpaHistory.map(g => parseFloat(g.term_gpa)),
      best_gpa: bestGPA,
      passed_courses: coursesStats[0]?.passed_courses || 0,
      total_completed_courses: coursesStats[0]?.total_completed_courses || 0,
      failed_courses: coursesStats[0]?.failed_courses || 0
    };

    return success(res, { ...profile, quick_stats });
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { phone, address, permanent_address, guardian_name, guardian_phone, guardian_relation, blood_group } = req.body;
    const f = [], p = [];
    if (phone !== undefined) { f.push('phone=?'); p.push(phone); }
    if (address !== undefined) { f.push('address=?'); p.push(address); }
    if (permanent_address !== undefined) { f.push('permanent_address=?'); p.push(permanent_address); }
    if (guardian_name !== undefined) { f.push('guardian_name=?'); p.push(guardian_name); }
    if (guardian_phone !== undefined) { f.push('guardian_phone=?'); p.push(guardian_phone); }
    if (guardian_relation !== undefined) { f.push('guardian_relation=?'); p.push(guardian_relation); }
    if (blood_group !== undefined) { f.push('blood_group=?'); p.push(blood_group); }
    
    if (!f.length) return success(res, null, 'Nothing to update');
    p.push(req.user.userId);
    await pool.query(`UPDATE student SET ${f.join(',')} WHERE student_id=?`, p);
    return success(res, null, 'Profile updated');
  } catch (err) { next(err); }
}

async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'No photo uploaded');
    const photoUrl = `/uploads/student-photos/${req.file.filename}`;
    await pool.query('UPDATE student SET photo_url=? WHERE student_id=?', [photoUrl, req.user.userId]);
    return success(res, { photo_url: photoUrl }, 'Photo updated');
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const [rows] = await pool.query('SELECT password FROM student WHERE student_id=?', [req.user.userId]);
    if (!rows.length) return notFound(res);
    
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(current_password, rows[0].password);
    if (!isMatch) return badRequest(res, 'Incorrect current password');
    
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE student SET password=? WHERE student_id=?', [hashed, req.user.userId]);
    return success(res, null, 'Password updated');
  } catch (err) { next(err); }
}

async function getLoginHistory(req, res, next) {
  try {
    let rows = [];
    try {
      const [resRows] = await pool.query('SELECT ip_address, user_agent, status, created_at FROM login_history WHERE user_id=? ORDER BY created_at DESC LIMIT 5', [req.user.userId]);
      rows = resRows;
    } catch(e) {}
    return success(res, rows);
  } catch (err) { next(err); }
}

// --- Retake & Improvement System ---

async function getEligibleRetakeImprove(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [student] = await pool.query('SELECT student_id, level, term, dept_id FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res);
    const s = student[0];

    // Retakeable: any course where the student's BEST grade is F (0.00)
    const [retakeable] = await pool.query(`
      SELECT e.enrollment_id, c.course_code, c.course_name, c.credit, c.course_id,
             sem.level, sem.term, sem.academic_year,
             e.grade_point, e.grade_letter, e.attempt_number
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE e.student_id = ? AND e.status = 'Completed' AND e.grade_point = 0
        AND co.course_id NOT IN (
          SELECT co2.course_id FROM enrollment e2
          JOIN course_offering co2 ON e2.offering_id = co2.offering_id
          WHERE e2.student_id = ? AND e2.status IN ('Registered') AND e2.enrollment_type IN ('Retake')
        )
      ORDER BY sem.level, sem.term, c.course_code
    `, [studentId, studentId]);

    // Improveable: courses from exactly (current_level - 1, current_term) where grade > 0
    const improveLevel = s.level - 1;
    const improveTerm = s.term;
    let improveable = [];

    if (improveLevel >= 1) {
      const [rows] = await pool.query(`
        SELECT e.enrollment_id, c.course_code, c.course_name, c.credit, c.course_id,
               sem.level, sem.term, sem.academic_year,
               e.grade_point, e.grade_letter, e.attempt_number
        FROM enrollment e
        JOIN course_offering co ON e.offering_id = co.offering_id
        JOIN course c ON co.course_id = c.course_id
        JOIN semester sem ON co.semester_id = sem.semester_id
        WHERE e.student_id = ? AND e.status = 'Completed'
          AND e.grade_point > 0 AND e.grade_point < 3.25
          AND sem.level = ? AND sem.term = ?
          AND co.course_id NOT IN (
            SELECT co2.course_id FROM enrollment e2
            JOIN course_offering co2 ON e2.offering_id = co2.offering_id
            WHERE e2.student_id = ? AND e2.status IN ('Registered') AND e2.enrollment_type = 'Improvement'
          )
        ORDER BY c.course_code
      `, [studentId, improveLevel, improveTerm, studentId]);
      improveable = rows;
    }

    // Compute credit summary for retake/improve
    const [studentSemester] = await pool.query('SELECT * FROM semester WHERE dept_id=? AND level=? AND term=? AND is_active=1', [s.dept_id, s.level, s.term]);
    let credit_summary = null;
    if (studentSemester.length) {
      const sem = studentSemester[0];
      const [fixedRow] = await pool.query(`SELECT COALESCE(SUM(c.credit),0) AS fixed FROM course_offering co JOIN course c ON co.course_id=c.course_id WHERE co.semester_id=?`, [sem.semester_id]);
      const [extraUsedRow] = await pool.query(`SELECT COALESCE(SUM(c.credit),0) AS used FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id JOIN course c ON co.course_id=c.course_id WHERE e.student_id=? AND e.status='Registered' AND e.enrollment_type IN ('Retake','Improvement')`, [studentId]);
      const fixed = parseFloat(fixedRow[0].fixed);
      const extraAllowed = 8.0;
      const extraUsed = parseFloat(extraUsedRow[0].used);
      credit_summary = {
        fixed_credit: fixed,
        max_credit: fixed + extraAllowed,
        extra_allowed: extraAllowed,
        extra_used: parseFloat(extraUsed.toFixed(1)),
        extra_remaining: parseFloat((extraAllowed - extraUsed).toFixed(1))
      };
    }

    return success(res, {
      currentLevel: s.level,
      currentTerm: s.term,
      improveLevel,
      improveTerm,
      retakeable: retakeable.map(r => ({ ...r, type: 'Retake' })),
      improveable: improveable.map(r => ({ ...r, type: 'Improvement' })),
      credit_summary
    });
  } catch (err) { next(err); }
}

async function enrollRetake(req, res, next) {
  try {
    const studentId = req.user.userId;
    const { course_id, original_enrollment_id } = req.body;

    const [student] = await pool.query('SELECT * FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res, 'Student not found');
    const s = student[0];

    // Check student has an active semester to allow registration at all
    const [studentSemester] = await pool.query('SELECT * FROM semester WHERE dept_id=? AND level=? AND term=? AND is_active=1', [s.dept_id, s.level, s.term]);
    if (!studentSemester.length) return badRequest(res, 'Registration is currently closed for your level/term.');

    // Find if the course is offered in ANY active semester in the department
    const [offering] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.credit FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE sem.dept_id = ? AND sem.is_active = 1 AND c.course_id = ?
    `, [s.dept_id, course_id]);
    
    if (!offering.length) return badRequest(res, 'This course is not offered in any active semester right now.');

    // Credit limit check: compute extra credit slots
    const sem = studentSemester[0];
    const [fixedRow] = await pool.query(`
      SELECT COALESCE(SUM(c.credit),0) AS fixed FROM course_offering co
      JOIN course c ON co.course_id=c.course_id WHERE co.semester_id=?
    `, [sem.semester_id]);
    const [extraUsedRow] = await pool.query(`
      SELECT COALESCE(SUM(c.credit),0) AS used FROM enrollment e
      JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id
      WHERE e.student_id=? AND e.status='Registered' AND e.enrollment_type IN ('Retake','Improvement')
    `, [studentId]);
    const extraAllowed = 8.0;
    const extraRemaining = extraAllowed - parseFloat(extraUsedRow[0].used);
    if (parseFloat(offering[0].credit) > extraRemaining) {
      return badRequest(res, `Extra credit limit exceeded. Only ${extraRemaining.toFixed(1)} extra credits remaining (max 8.0 allowed).`);
    }

    // Check attempt count
    const [attempts] = await pool.query(`
      SELECT COUNT(*) as cnt FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.course_id = ?
    `, [studentId, course_id]);

    // Check not already registered
    const [existing] = await pool.query("SELECT enrollment_id FROM enrollment WHERE student_id=? AND offering_id=? AND status='Registered'", [studentId, offering[0].offering_id]);
    if (existing.length) return badRequest(res, 'Already registered for this course');

    // Register (using the student's current level/term to record when they took it)
    const [r] = await pool.query(`
      INSERT INTO enrollment (student_id, offering_id, level, term, status, enrollment_type, retake_of, attempt_number)
      VALUES (?, ?, ?, ?, 'Registered', 'Retake', ?, ?)
    `, [studentId, offering[0].offering_id, s.level, s.term, original_enrollment_id, attempts[0].cnt + 1]);

    return success(res, {
      enrollment_id: r.insertId,
      course_code: offering[0].course_code,
      attempt_number: attempts[0].cnt + 1
    }, `Registered for ${offering[0].course_code} (Retake Attempt #${attempts[0].cnt + 1})`);
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Already enrolled'); next(err); }
}

async function enrollImprove(req, res, next) {
  try {
    const studentId = req.user.userId;
    const { course_id, original_enrollment_id } = req.body;

    const [student] = await pool.query('SELECT * FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res, 'Student not found');
    const s = student[0];

    // Check student has an active semester
    const [studentSemester] = await pool.query('SELECT * FROM semester WHERE dept_id=? AND level=? AND term=? AND is_active=1', [s.dept_id, s.level, s.term]);
    if (!studentSemester.length) return badRequest(res, 'Registration is currently closed for your level/term.');

    const improveLevel = s.level - 1;
    if (improveLevel < 1) return badRequest(res, 'No courses eligible for improvement');

    const [origEnroll] = await pool.query(`
      SELECT e.*, sem.level AS sem_level, sem.term AS sem_term FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE e.enrollment_id = ? AND e.student_id = ?
    `, [original_enrollment_id, studentId]);
    if (!origEnroll.length) return badRequest(res, 'Original enrollment not found');
    if (origEnroll[0].sem_level !== improveLevel || origEnroll[0].sem_term !== s.term)
      return badRequest(res, 'Can only improve courses from exactly 1 year ago (same term)');
    if (origEnroll[0].grade_point === 0) return badRequest(res, 'Cannot improve F grade — use Retake instead');

    // Find if course is offered in any active semester
    const [offering] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.credit FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE sem.dept_id = ? AND sem.is_active = 1 AND c.course_id = ?
    `, [s.dept_id, course_id]);
    if (!offering.length) return badRequest(res, 'Course not offered in any active semester right now.');

    // Credit limit check
    const sem = studentSemester[0];
    const [fixedRow] = await pool.query(`
      SELECT COALESCE(SUM(c.credit),0) AS fixed FROM course_offering co
      JOIN course c ON co.course_id=c.course_id WHERE co.semester_id=?
    `, [sem.semester_id]);
    const [extraUsedRow] = await pool.query(`
      SELECT COALESCE(SUM(c.credit),0) AS used FROM enrollment e
      JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id
      WHERE e.student_id=? AND e.status='Registered' AND e.enrollment_type IN ('Retake','Improvement')
    `, [studentId]);
    const extraAllowed = 8.0;
    const extraRemaining = extraAllowed - parseFloat(extraUsedRow[0].used);
    if (parseFloat(offering[0].credit) > extraRemaining) {
      return badRequest(res, `Extra credit limit exceeded. Only ${extraRemaining.toFixed(1)} extra credits remaining (max 8.0 allowed).`);
    }

    const [attempts] = await pool.query(`
      SELECT COUNT(*) as cnt FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.course_id = ?
    `, [studentId, course_id]);

    const [existing] = await pool.query("SELECT enrollment_id FROM enrollment WHERE student_id=? AND offering_id=? AND status='Registered'", [studentId, offering[0].offering_id]);
    if (existing.length) return badRequest(res, 'Already registered');

    const [r] = await pool.query(`
      INSERT INTO enrollment (student_id, offering_id, level, term, status, enrollment_type, retake_of, attempt_number)
      VALUES (?, ?, ?, ?, 'Registered', 'Improvement', ?, ?)
    `, [studentId, offering[0].offering_id, s.level, s.term, original_enrollment_id, attempts[0].cnt + 1]);

    return success(res, {
      enrollment_id: r.insertId,
      course_code: offering[0].course_code,
      attempt_number: attempts[0].cnt + 1
    }, `Registered for ${offering[0].course_code} (Improvement Attempt #${attempts[0].cnt + 1})`);
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Already enrolled'); next(err); }
}

/**
 * GET /api/student/transcript/pdf
 * Generates and streams the official PDF transcript for download.
 */
async function getTranscriptPDF(req, res, next) {
  try {
    const studentId = req.user.userId;

    // Fetch student info (same query as getTranscript)
    const [studentRows] = await pool.query(
      'SELECT s.*, d.dept_code, d.dept_name FROM student s JOIN department d ON s.dept_id=d.dept_id WHERE s.student_id=?',
      [studentId]
    );
    if (!studentRows.length) return notFound(res, 'Student not found');
    const { password: _, ...student } = studentRows[0];

    // Fetch completed enrollments
    const [records] = await pool.query(`
      SELECT e.enrollment_id, e.grade_point, e.grade_letter, e.status, e.enrollment_type,
        c.course_id, c.course_code, c.course_name, c.credit,
        sem.academic_year, sem.level, sem.term
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE e.student_id = ? AND e.status = 'Completed'
      ORDER BY sem.level, sem.term, c.course_code
    `, [studentId]);

    const pdfBuffer = await generateTranscriptPDF(student, records);

    const filename = `GSTU_Transcript_${studentId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) { next(err); }
}
async function getGpaTrend(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [records] = await pool.query(`
      SELECT sem.level, sem.term, 
             e.grade_point, c.credit
      FROM enrollment e
      JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=? AND e.status='Completed' AND e.grade_point IS NOT NULL
      ORDER BY sem.level, sem.term
    `, [studentId]);

    const semesters = {};
    let runningGp = 0;
    let runningCr = 0;

    for (const r of records) {
      const key = `L${r.level}T${r.term}`;
      if (!semesters[key]) {
        semesters[key] = { label: key, level: r.level, term: r.term, gp: 0, cr: 0 };
      }
      const gp = parseFloat(r.grade_point) * parseFloat(r.credit);
      const cr = parseFloat(r.credit);
      
      semesters[key].gp += gp;
      semesters[key].cr += cr;
    }

    const trend = [];
    const keys = Object.keys(semesters).sort((a,b) => {
      const sA = semesters[a], sB = semesters[b];
      return sA.level === sB.level ? sA.term - sB.term : sA.level - sB.level;
    });

    for (const key of keys) {
      const sem = semesters[key];
      runningGp += sem.gp;
      runningCr += sem.cr;
      trend.push({
        label: key,
        level: sem.level,
        term: sem.term,
        semester_gpa: parseFloat((sem.gp / sem.cr).toFixed(3)),
        cgpa: parseFloat((runningGp / runningCr).toFixed(3))
      });
    }

    return success(res, trend);
  } catch (err) { next(err); }
}

async function getMyCourses(req, res, next) {
  try {
    const filter = req.query.semester; // 'active' or 'all'
    const queryBase = `
      SELECT e.enrollment_id, e.status, e.enrollment_type,
             c.course_code, c.course_name, c.credit, c.course_type,
             co.offering_id,
             t.name AS teacher_name, t.email AS teacher_email, t.teacher_code,
             sem.academic_year, sem.level, sem.term, sem.is_active
      FROM enrollment e
      JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id
      LEFT JOIN teacher t ON co.teacher_id=t.teacher_id
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE e.student_id=?
    `;
    
    let rows;
    if (filter === 'all') {
      [rows] = await pool.query(queryBase + `
        AND (sem.level != (SELECT level FROM student WHERE student_id=?) 
          OR sem.term != (SELECT term FROM student WHERE student_id=?))
        ORDER BY sem.level DESC, sem.term DESC, c.course_code
      `, [req.user.userId, req.user.userId, req.user.userId]);
    } else {
      [rows] = await pool.query(queryBase + `
        AND sem.level = (SELECT level FROM student WHERE student_id=?)
        AND sem.term = (SELECT term FROM student WHERE student_id=?)
        ORDER BY c.course_code
      `, [req.user.userId, req.user.userId, req.user.userId]);
    }
    
    await attachSchedules(rows);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getCourseBreakdown(req, res, next) {
  try {
    const { enrollmentId } = req.params;
    
    // ... logic for breakdown (omitted in snippet as it's partial, wait, I need to make sure I don't break the existing code)
    const [enrollment] = await pool.query(`
      SELECT e.is_published, c.course_type, e.grade_letter, e.grade_point
      FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id
      JOIN course c ON co.course_id=c.course_id
      WHERE e.enrollment_id=? AND e.student_id=?
    `, [enrollmentId, req.user.userId]);

    if (!enrollment.length) return notFound(res, 'Enrollment not found');

    // We no longer block access if it's not published.
    // Students can view partial marks (mid, assignment, attendance) during the semester.

    const [breakdown] = await pool.query('SELECT * FROM marks_breakdown WHERE enrollment_id=?', [enrollmentId]);
    const [config] = await pool.query('SELECT * FROM marks_config WHERE course_type=?', [enrollment[0].course_type]);

    // If no marks entered yet, return empty zeros instead of an error
    const breakdownData = breakdown.length ? breakdown[0] : {
      attendance_marks: null,
      assignment_marks: null,
      mid_marks: null,
      final_marks: null,
      total_marks: null
    };

    return success(res, {
      course_type: enrollment[0].course_type,
      breakdown: breakdownData,
      config: config[0] || {},
      grade: { letter: enrollment[0].grade_letter, point: enrollment[0].grade_point },
      has_marks: breakdown.length > 0
    });
  } catch (err) { next(err); }
}

async function getPublishedSemesters(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [student] = await pool.query('SELECT dept_id FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res);
    
    const [semesters] = await pool.query(`
      SELECT semester_id, academic_year, level, term, result_published_at
      FROM semester
      WHERE dept_id=? AND result_status='Published'
      ORDER BY academic_year DESC, level DESC, term DESC
    `, [student[0].dept_id]);
    
    return success(res, semesters);
  } catch (err) { next(err); }
}

async function getResultBoard(req, res, next) {
  try {
    const studentId = req.user.userId;
    const { semesterId } = req.params;
    
    const [student] = await pool.query('SELECT dept_id FROM student WHERE student_id=?', [studentId]);
    if (!student.length) return notFound(res);
    
    const [semester] = await pool.query(`
      SELECT s.academic_year, s.level, s.term, s.result_status, d.dept_name, d.dept_code
      FROM semester s
      JOIN department d ON s.dept_id = d.dept_id
      WHERE s.semester_id=? AND s.dept_id=?
    `, [semesterId, student[0].dept_id]);
    
    if (!semester.length) return notFound(res, 'Semester not found');
    if (semester[0].result_status !== 'Published') return badRequest(res, 'Results for this semester are not published yet.');
    
    const sem = semester[0];
    const termNames = ['First', 'Second', 'Third', 'Fourth'];
    const levelStr = termNames[sem.level - 1] ? termNames[sem.level - 1] + ' Year' : `Level ${sem.level}`;
    
    const semester_info = {
      exam_id: `${sem.academic_year}-${sem.dept_code}-REG-${sem.level}-${sem.term}`,
      degree: "B.Sc. Engg.",
      department: sem.dept_name,
      session: sem.academic_year,
      semester_label: `${levelStr}, Semester-${sem.term}`
    };
    
    const [grades] = await pool.query(`
      SELECT 
        e.student_id,
        c.course_code,
        e.grade_letter,
        e.grade_point,
        c.credit
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE co.semester_id = ?
        AND e.status = 'Completed'
      ORDER BY e.student_id, c.course_code
    `, [semesterId]);
    
    const courseMap = new Map();
    grades.forEach(g => {
      if (!courseMap.has(g.course_code)) {
        courseMap.set(g.course_code, { course_code: g.course_code, credit: parseFloat(g.credit) });
      }
    });
    const courses = Array.from(courseMap.values()).sort((a,b) => a.course_code.localeCompare(b.course_code));
    
    const studentMap = new Map();
    grades.forEach(g => {
      if (!studentMap.has(g.student_id)) {
        studentMap.set(g.student_id, {
          student_id: g.student_id,
          grades: {},
          credit_offered: 0,
          credit_secured: 0,
          points_secured: 0,
          gpa: 0,
          incomplete: []
        });
      }
      
      const s = studentMap.get(g.student_id);
      s.grades[g.course_code] = g.grade_letter || 'N/A';
      
      const credit = parseFloat(g.credit);
      const points = parseFloat(g.grade_point) || 0;
      
      s.credit_offered += credit;
      if (g.grade_letter !== 'F' && g.grade_letter !== 'N/A') {
        s.credit_secured += credit;
        s.points_secured += (credit * points);
      } else if (g.grade_letter === 'F') {
        s.incomplete.push(g.course_code);
      }
    });
    
    const studentsList = Array.from(studentMap.values()).map(s => {
      s.gpa = s.credit_offered > 0 ? (s.points_secured / s.credit_offered).toFixed(3) : "0.000";
      return s;
    });
    
    return success(res, {
      semester_info,
      courses,
      students: studentsList
    });
    
  } catch (err) { next(err); }
}
async function getTeacherPublicProfile(req, res, next) {
  try {
    const { teacherCode } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        t.name, t.teacher_code, t.email, t.phone, t.designation, t.photo_url, 
        t.bio, t.research_interests, t.office_room, t.office_hours,
        d.dept_name, d.dept_code
      FROM teacher t
      LEFT JOIN department d ON t.dept_id = d.dept_id
      WHERE t.teacher_code = ? AND t.is_active = 1
    `, [teacherCode]);

    if (!rows.length) {
      return notFound(res, 'Teacher not found or inactive');
    }

    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getAvailableCourses, enroll, dropCourse, getEnrollments, getTranscript, getCGPA, getProfile, updateProfile, uploadPhoto, changePassword, getLoginHistory, getEligibleRetakeImprove, enrollRetake, enrollImprove, getTranscriptPDF, getGraduationStatus, getGpaTrend, getMyCourses, getCourseBreakdown, getPublishedSemesters, getResultBoard, getTeacherPublicProfile };
