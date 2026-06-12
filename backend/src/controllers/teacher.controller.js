const pool = require('../config/db');
const { success, error, notFound } = require('../utils/response');
const { gradePointToLetter } = require('../utils/gradeMapper');
const { sendNotification, sendBulkNotifications } = require('../services/notification.service');
const { attachSchedules } = require('../services/schedule.service');
const PDFDocument = require('pdfkit');
const Papa = require('papaparse');

async function getDashboard(req, res, next) {
  try {
    const teacherId = req.user.userId;
    
    // 1. Stats
    const [statsResult] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM course_offering co JOIN semester s ON co.semester_id=s.semester_id WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?) AND (s.result_status != 'Published' OR s.result_status IS NULL)) AS active_courses,
        (SELECT COUNT(*) FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id JOIN semester s ON co.semester_id=s.semester_id WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?) AND (s.result_status != 'Published' OR s.result_status IS NULL) AND e.status IN ('Registered', 'Completed')) AS total_students,
        (SELECT AVG(grade_point) FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id JOIN semester s ON co.semester_id=s.semester_id WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?) AND (s.result_status != 'Published' OR s.result_status IS NULL) AND grade_point IS NOT NULL) AS avg_grade
    `, [teacherId, teacherId, teacherId]);

    // 2. Schedule and Actions (Active Courses data)
    const [courses] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.course_name, c.credit, c.course_type,
        sem.academic_year, sem.level, sem.term, d.dept_code,
        (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.status IN ('Registered', 'Completed')) AS enrolled_count,
        (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.status IN ('Registered', 'Completed') AND e.grade_point IS NULL) AS ungraded_count,
        IF(sem.semester_id = (SELECT s2.semester_id FROM semester s2 WHERE s2.academic_year = sem.academic_year AND s2.dept_id = sem.dept_id ORDER BY s2.level DESC, s2.term DESC LIMIT 1) AND (sem.result_status != 'Published' OR sem.result_status IS NULL), 1, 0) AS is_running
      FROM course_offering co 
      JOIN course c ON co.course_id=c.course_id 
      JOIN semester sem ON co.semester_id=sem.semester_id
      JOIN department d ON sem.dept_id=d.dept_id
      WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?)
      HAVING is_running = 1
      ORDER BY c.course_code
    `, [teacherId]);
    await attachSchedules(courses);

    let pendingGrades = 0;
    courses.forEach(c => { if (c.ungraded_count > 0) pendingGrades++; });

    const stats = {
      active_courses: courses.length,
      total_students: courses.reduce((sum, c) => sum + c.enrolled_count, 0),
      avg_grade: statsResult[0].avg_grade ? parseFloat(statsResult[0].avg_grade).toFixed(2) : 'N/A',
      pending_grades: pendingGrades
    };

    return success(res, { stats, activeCourses: courses });
  } catch (err) { next(err); }
}

async function getCourses(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.course_name, c.credit, c.course_type,
        sem.academic_year, sem.level, sem.term, sem.is_active, sem.result_status,
        IF(sem.semester_id = (SELECT s2.semester_id FROM semester s2 WHERE s2.academic_year = sem.academic_year AND s2.dept_id = sem.dept_id ORDER BY s2.level DESC, s2.term DESC LIMIT 1) AND (sem.result_status != 'Published' OR sem.result_status IS NULL), 1, 0) AS is_running
      FROM course_offering co 
      JOIN course c ON co.course_id=c.course_id 
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?)
      ORDER BY sem.academic_year DESC, sem.level, sem.term
    `, [req.user.userId]);

    // Calculate Grade Submission Status for each
    const coursesWithStatus = await Promise.all(rows.map(async (c) => {
      const [enrollments] = await pool.query('SELECT grade_point, is_published FROM enrollment WHERE offering_id = ? AND status IN ("Registered", "Completed")', [c.offering_id]);
      
      const total = enrollments.length;
      const graded = enrollments.filter(e => e.grade_point !== null).length;
      const published = enrollments.filter(e => e.is_published === 1).length;

      let status = 'Not Started';
      if (total > 0) {
        if (published === total) status = 'Published';
        else if (graded === total) status = 'Submitted';
        else if (graded > 0) status = 'In Progress';
      }

      return { ...c, enrolled_count: total, graded_count: graded, grade_status: status };
    }));

    await attachSchedules(coursesWithStatus);
    return success(res, coursesWithStatus);
  } catch (err) { next(err); }
}

async function getActiveCourses(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.course_name, c.credit, c.course_type,
        sem.academic_year, sem.level, sem.term,
        (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.status IN ('Registered', 'Completed')) AS enrolled_count
      FROM course_offering co JOIN course c ON co.course_id=c.course_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?) AND (sem.result_status != 'Published' OR sem.result_status IS NULL)
    `, [req.user.userId]);
    await attachSchedules(rows);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getCourseStudents(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT e.enrollment_id, e.student_id, s.name, s.batch, e.grade_point, e.grade_letter, e.status, e.is_published
      FROM enrollment e JOIN student s ON e.student_id=s.student_id
      WHERE e.offering_id=? AND e.status IN ('Registered', 'Completed') 
      ORDER BY s.batch DESC, s.student_id ASC
    `, [req.params.offeringId]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function updateGrade(req, res, next) {
  try {
    const { enrollmentId } = req.params;
    const { grade_point } = req.body;
    if (grade_point === undefined) return error(res, 'Grade point is required', 400);

    const grade_p = parseFloat(grade_point);
    if (isNaN(grade_p) || grade_p < 0 || grade_p > 4) {
      return error(res, 'Grade point must be between 0.00 and 4.00', 400);
    }

    const gradeLetter = gradePointToLetter(grade_p);

    const [enrollCheck] = await pool.query(`
      SELECT e.is_published, co.teacher_id, t.teacher_code
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN teacher t ON co.teacher_id = t.teacher_id
      WHERE e.enrollment_id = ?
    `, [enrollmentId]);

    if (!enrollCheck.length) return notFound(res, 'Enrollment not found');
    if (enrollCheck[0].teacher_code !== req.user.userId) return error(res, 'Access denied.', 403);
    if (enrollCheck[0].is_published === 1) return error(res, 'Grades are already published and cannot be modified.', 403);

    // Set grade but do NOT recalculate CGPA. Status becomes Completed since they are finished with the course, but not published yet.
    await pool.query('UPDATE enrollment SET grade_point = ?, grade_letter = ?, status = "Completed" WHERE enrollment_id = ?', [grade_p, gradeLetter, enrollmentId]);
    
    return success(res, { grade_point: grade_p, grade_letter: gradeLetter }, 'Grade saved as Draft');
  } catch (err) { next(err); }
}

async function bulkUpdateGrades(req, res, next) {
  try {
    const { offeringId } = req.params;
    const { grades } = req.body;
    if (!Array.isArray(grades)) return error(res, 'Grades must be an array', 400);

    const [offering] = await pool.query(`
      SELECT co.offering_id, t.teacher_code
      FROM course_offering co
      JOIN teacher t ON co.teacher_id = t.teacher_id
      WHERE co.offering_id = ?
    `, [offeringId]);

    if (!offering.length) return notFound(res, 'Course offering not found');
    if (offering[0].teacher_code !== req.user.userId) return error(res, 'Access denied.', 403);

    let updatedCount = 0;
    for (const g of grades) {
      const grade_p = parseFloat(g.grade_point);
      if (isNaN(grade_p) || grade_p < 0 || grade_p > 4) continue;
      const gl = gradePointToLetter(grade_p);
      
      const enrId = g.enrollment_id;
      if (enrId) {
        const [enrCheck] = await pool.query('SELECT is_published FROM enrollment WHERE enrollment_id=?', [enrId]);
        if (enrCheck.length && enrCheck[0].is_published === 0) {
          await pool.query(
            `UPDATE enrollment SET grade_point=?, grade_letter=?, status='Completed' WHERE enrollment_id=? AND offering_id=?`,
            [grade_p, gl, enrId, offeringId]
          );
          updatedCount++;
        }
      }
    }

    return success(res, { updated: updatedCount }, 'Grades saved as Draft successfully');
  } catch (err) { next(err); }
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT t.teacher_code, t.name, t.email, t.phone, t.designation, t.photo_url, t.bio, t.research_interests, t.office_room, t.office_hours,
             d.dept_code, d.dept_name
      FROM teacher t JOIN department d ON t.dept_id=d.dept_id WHERE t.teacher_code=?
    `, [req.user.userId]);
    
    if (!rows.length) return notFound(res);
    
    // Teaching history
    const [history] = await pool.query(`
      SELECT sem.academic_year, sem.level, sem.term, c.course_code, c.course_name,
        (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.status IN ('Registered', 'Completed')) AS enrolled_count,
        (SELECT AVG(grade_point) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.grade_point IS NOT NULL) AS avg_grade
      FROM course_offering co
      JOIN course c ON co.course_id=c.course_id
      JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE co.teacher_id=(SELECT teacher_id FROM teacher WHERE teacher_code=?)
      ORDER BY sem.academic_year DESC, sem.level, sem.term
    `, [req.user.userId]);

    return success(res, { ...rows[0], teaching_history: history });
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { phone, bio, research_interests, office_room, office_hours } = req.body;
    const f = [], p = [];
    
    if (phone !== undefined) { f.push('phone=?'); p.push(phone); }
    if (bio !== undefined) { f.push('bio=?'); p.push(bio); }
    if (research_interests !== undefined) { f.push('research_interests=?'); p.push(research_interests); }
    if (office_room !== undefined) { f.push('office_room=?'); p.push(office_room); }
    if (office_hours !== undefined) { f.push('office_hours=?'); p.push(office_hours); }
    
    if (!f.length) return success(res, null, 'Nothing to update');
    p.push(req.user.userId);
    
    await pool.query(`UPDATE teacher SET ${f.join(',')} WHERE teacher_code=?`, p);
    return success(res, null, 'Profile updated');
  } catch (err) { next(err); }
}

async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return error(res, 'No photo uploaded', 400);
    const photoUrl = `/uploads/teacher-photos/${req.file.filename}`;
    await pool.query('UPDATE teacher SET photo_url=? WHERE teacher_code=?', [photoUrl, req.user.userId]);
    return success(res, { photo_url: photoUrl }, 'Photo updated');
  } catch (err) { next(err); }
}

async function exportCourseStudents(req, res, next) {
  try {
    const { offeringId } = req.params;
    const { format } = req.query; // 'pdf' or 'csv'

    // Verify ownership
    const [offering] = await pool.query(`
      SELECT co.offering_id, t.teacher_code, c.course_code, c.course_name, sem.academic_year, sem.level, sem.term
      FROM course_offering co
      JOIN teacher t ON co.teacher_id = t.teacher_id
      JOIN course c ON co.course_id = c.course_id
      JOIN semester sem ON co.semester_id = sem.semester_id
      WHERE co.offering_id = ?
    `, [offeringId]);

    if (!offering.length || offering[0].teacher_code !== req.user.userId) return notFound(res, 'Access denied or course not found');

    const [students] = await pool.query(`
      SELECT e.student_id, s.name, s.batch, e.grade_point, e.grade_letter, e.is_published
      FROM enrollment e JOIN student s ON e.student_id=s.student_id
      WHERE e.offering_id=? AND e.status IN ('Registered', 'Completed') 
      ORDER BY s.batch DESC, s.student_id ASC
    `, [offeringId]);

    if (format === 'csv') {
      const csvData = students.map(s => ({
        'Student ID': s.student_id,
        'Name': s.name,
        'Grade Point': s.grade_point || '',
        'Grade Letter': s.grade_letter || '',
        'Status': s.is_published ? 'Published' : (s.grade_point !== null ? 'Draft' : 'Pending')
      }));
      const csvStr = Papa.unparse(csvData);
      res.setHeader('Content-disposition', `attachment; filename="${offering[0].course_code}_Roster.csv"`);
      res.setHeader('Content-type', 'text/csv');
      return res.send(csvStr);
    } 
    
    // Default: PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', `attachment; filename="${offering[0].course_code}_Roster.pdf"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text(`GSTU Course Roster - ${offering[0].course_code}`, { align: 'center' });
    doc.fontSize(12).text(`${offering[0].course_name}`, { align: 'center' });
    doc.text(`Semester: ${offering[0].academic_year} (L${offering[0].level}T${offering[0].term})`, { align: 'center' });
    doc.moveDown(2);

    const startX = 50;
    let y = doc.y;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student ID', startX, y);
    doc.text('Name', startX + 100, y);
    doc.text('Batch', startX + 350, y);
    doc.text('Grade', startX + 420, y);
    y += 15;
    doc.moveTo(startX, y).lineTo(500, y).stroke();
    y += 10;

    doc.font('Helvetica');
    students.forEach(r => {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.text(r.student_id, startX, y);
      doc.text(r.name.substring(0, 35), startX + 100, y);
      doc.text(r.batch, startX + 350, y);
      doc.text(r.grade_letter || '—', startX + 420, y);
      y += 15;
    });

    doc.end();
  } catch (err) { next(err); }
}

async function getCourseMarks(req, res, next) {
  try {
    const { offeringId } = req.params;
    const [offering] = await pool.query('SELECT co.teacher_id, co.marks_submitted_at, co.marks_status, c.course_type FROM course_offering co JOIN teacher t ON co.teacher_id=t.teacher_id JOIN course c ON co.course_id=c.course_id WHERE co.offering_id=? AND t.teacher_code=?', [offeringId, req.user.userId]);
    if (!offering.length) return notFound(res, 'Course offering not found');

    const [students] = await pool.query(`
      SELECT 
        e.enrollment_id, s.student_id as student_code, s.name, e.grade_letter, e.grade_point, e.is_published,
        mb.breakdown_id, mb.attendance_marks, mb.assignment_marks, mb.mid_marks, mb.final_marks, mb.total_marks
      FROM enrollment e
      JOIN student s ON e.student_id = s.student_id
      LEFT JOIN marks_breakdown mb ON e.enrollment_id = mb.enrollment_id
      WHERE e.offering_id = ? AND e.status IN ('Registered', 'Completed')
      ORDER BY s.batch DESC, s.student_id ASC
    `, [offeringId]);

    const [config] = await pool.query('SELECT * FROM marks_config WHERE course_type=?', [offering[0].course_type]);
    const [gradingScale] = await pool.query('SELECT * FROM grading_scale ORDER BY min_marks DESC');

    return success(res, {
      course_type: offering[0].course_type,
      marks_submitted_at: offering[0].marks_submitted_at,
      marks_status: offering[0].marks_status,
      config: config[0],
      grading_scale: gradingScale,
      students
    });
  } catch (err) { next(err); }
}

async function saveCourseMarks(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { offeringId } = req.params;
    const marksData = req.body; 
    const { calculateGrade } = require('../services/marks.service');

    const [offering] = await connection.query(`
      SELECT co.teacher_id, co.marks_status, c.course_code, c.course_name,
             s.dept_id, t.name as teacher_name
      FROM course_offering co 
      JOIN teacher t ON co.teacher_id=t.teacher_id 
      JOIN course c ON co.course_id=c.course_id
      JOIN semester s ON co.semester_id=s.semester_id
      WHERE co.offering_id=? AND t.teacher_code=?
    `, [offeringId, req.user.userId]);
    if (!offering.length) throw new Error('Course offering not found');
    if (offering[0].marks_status === 'Completed') throw new Error('Marks are locked by Dept Staff');

    await connection.beginTransaction();

    for (const m of marksData) {
      const att = parseFloat(m.attendance) || 0;
      const asg = parseFloat(m.assignment) || 0;
      const mid = parseFloat(m.mid) || 0;
      const fin = parseFloat(m.final) || 0;
      const total = att + asg + mid + fin;
      const grade = await calculateGrade(total);

      await connection.query(`
        INSERT INTO marks_breakdown 
          (enrollment_id, attendance_marks, assignment_marks, mid_marks, final_marks, total_marks, entered_by_role, entered_by_id)
        VALUES (?, ?, ?, ?, ?, ?, 'teacher', ?)
        ON DUPLICATE KEY UPDATE 
          attendance_marks=VALUES(attendance_marks),
          assignment_marks=VALUES(assignment_marks),
          mid_marks=VALUES(mid_marks),
          final_marks=VALUES(final_marks),
          total_marks=VALUES(total_marks),
          updated_by_role='teacher',
          updated_by_id=VALUES(entered_by_id)
      `, [m.enrollment_id, att, asg, mid, fin, total, offering[0].teacher_id]);

      await connection.query(`
        UPDATE enrollment SET grade_point=?, grade_letter=?
        WHERE enrollment_id=? AND is_published=0
      `, [grade.grade_point, grade.grade_letter, m.enrollment_id]);
    }

    await connection.commit();

    return success(res, null, 'Marks saved as Draft successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function submitCourseMarks(req, res, next) {
  try {
    const { offeringId } = req.params;
    const [offering] = await pool.query(`
      SELECT co.teacher_id, co.marks_status, c.course_code, c.course_name,
             s.dept_id, t.name as teacher_name
      FROM course_offering co 
      JOIN teacher t ON co.teacher_id=t.teacher_id
      JOIN course c ON co.course_id=c.course_id
      JOIN semester s ON co.semester_id=s.semester_id
      WHERE co.offering_id=? AND t.teacher_code=?
    `, [offeringId, req.user.userId]);
    
    if (!offering.length) return notFound(res, 'Course offering not found');
    if (offering[0].marks_status !== 'Pending') return error(res, 'Already submitted or locked', 400);

    await pool.query('UPDATE course_offering SET marks_status=?, marks_submitted_at=NOW(), marks_submitted_by=? WHERE offering_id=?', ['In Progress', offering[0].teacher_id, offeringId]);

    // Notify dept staff that marks have been submitted for review
    const o = offering[0];
    await sendNotification({
      userId: null,
      userType: 'dept_staff',
      deptId: o.dept_id,
      title: `✅ Marks Submitted – ${o.course_code}`,
      message: `${o.teacher_name} has submitted final marks for ${o.course_code} (${o.course_name}). Please review and publish.`,
      type: 'success',
      link: `/staff/grades`
    });

    return success(res, null, 'Marks submitted to Dept Staff');
  } catch (err) { next(err); }
}

module.exports = { 
  getDashboard, 
  getCourses, 
  getActiveCourses, 
  getCourseStudents, 
  getProfile, 
  updateProfile,
  updateGrade,
  bulkUpdateGrades,
  exportCourseStudents,
  getCourseMarks,
  saveCourseMarks,
  submitCourseMarks,
  uploadPhoto
};
