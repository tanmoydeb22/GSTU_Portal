const pool = require('../config/db');
const { success, badRequest, notFound } = require('../utils/response');
const { gradePointToLetter } = require('../utils/gradeMapper');
const { recalculateCGPA } = require('../services/cgpa.service');
const { sendBulkNotifications } = require('../services/notification.service');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function getCourseGrades(req, res, next) {
  try {
    const { semesterId, offeringId } = req.params;
    
    // Check if course belongs to dept? Assuming yes if they reached here or middleware handles it.
    const [rows] = await pool.query(`
      SELECT 
        e.enrollment_id, e.student_id, e.status, e.grade_point, e.grade_letter, e.is_published,
        s.name, s.batch
      FROM enrollment e
      JOIN student s ON e.student_id = s.student_id
      WHERE e.offering_id = ? AND e.status IN ('Registered', 'Completed')
      ORDER BY e.student_id ASC
    `, [offeringId]);
    
    return success(res, rows);
  } catch (err) { next(err); }
}

async function saveSingleGrade(req, res, next) {
  try {
    const { enrollmentId } = req.params;
    const { grade_point, grade_letter, reason } = req.body;
    
    const [current] = await pool.query('SELECT * FROM enrollment WHERE enrollment_id = ?', [enrollmentId]);
    if (!current.length) return notFound(res, 'Enrollment not found');
    
    const enroll = current[0];
    
    if (enroll.is_published === 1) {
      if (!reason) return badRequest(res, 'A reason is required to change a published grade');
      
      // Log to grade_audit
      await pool.query(`
        INSERT INTO grade_audit (enrollment_id, changed_by, old_grade_point, new_grade_point, old_grade_letter, new_grade_letter, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [enrollmentId, req.user.userId, enroll.grade_point, grade_point, enroll.grade_letter, grade_letter, reason]);
    }
    
    // Update grade
    // If we are grading, we mark status as 'Completed' if they actually received a grade (even F).
    await pool.query(`
      UPDATE enrollment 
      SET grade_point = ?, grade_letter = ?, status = 'Completed'
      WHERE enrollment_id = ?
    `, [grade_point, grade_letter, enrollmentId]);
    
    if (enroll.is_published === 1) {
      await recalculateCGPA(enroll.student_id);
    }
    
    return success(res, null, 'Grade saved');
  } catch (err) { next(err); }
}

async function bulkUploadPreview(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'Excel file required');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    
    const data = [];
    const errors = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const student_id = row.getCell(1).value?.toString()?.trim();
      const grade_point = parseFloat(row.getCell(2).value);
      const grade_letter = row.getCell(3).value?.toString()?.trim();
      
      if (!student_id) return;
      
      let error = null;
      if (isNaN(grade_point) || grade_point < 0 || grade_point > 4) error = 'Invalid grade point';
      else if (!grade_letter) error = 'Missing grade letter';
      
      if (error) {
        errors.push({ row: rowNumber, student_id, error });
      } else {
        data.push({ student_id, grade_point, grade_letter });
      }
    });
    
    fs.unlinkSync(req.file.path);
    return success(res, { data, errors });
  } catch (err) { 
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err); 
  }
}

async function bulkUploadConfirm(req, res, next) {
  try {
    const { offeringId, grades } = req.body; // grades: [{student_id, grade_point, grade_letter}]
    if (!grades || !grades.length) return badRequest(res, 'No grades provided');
    
    const [enrollments] = await pool.query('SELECT enrollment_id, student_id, is_published FROM enrollment WHERE offering_id = ?', [offeringId]);
    const enrollMap = new Map();
    enrollments.forEach(e => enrollMap.set(e.student_id, e));
    
    let updated = 0;
    for (const g of grades) {
      const e = enrollMap.get(g.student_id);
      if (e && e.is_published === 0) { // Do not bulk upload over published grades to be safe
        await pool.query('UPDATE enrollment SET grade_point = ?, grade_letter = ?, status = "Completed" WHERE enrollment_id = ?', [g.grade_point, g.grade_letter, e.enrollment_id]);
        updated++;
      }
    }
    
    return success(res, { updated }, 'Bulk grades saved');
  } catch (err) { next(err); }
}

async function publishGrades(req, res, next) {
  try {
    const { offeringId } = req.params;
    
    const [enrollments] = await pool.query(`
      SELECT e.enrollment_id, e.student_id, c.course_code 
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE e.offering_id = ? AND e.status = 'Completed' AND e.grade_point IS NOT NULL AND e.is_published = 0
    `, [offeringId]);
    
    if (!enrollments.length) return badRequest(res, 'No unpublished completed grades found for this course.');
    
    const ids = enrollments.map(e => e.enrollment_id);
    const studentIds = [...new Set(enrollments.map(e => e.student_id))];
    const courseCode = enrollments[0].course_code;
    
    await pool.query(`
      UPDATE enrollment 
      SET is_published = 1, published_at = NOW(), published_by = ?
      WHERE enrollment_id IN (?)
    `, [req.user.userId, ids]);
    
    // Recalculate CGPA for all students asynchronously
    for (const sid of studentIds) {
      await recalculateCGPA(sid);
    }
    
    // Send notification
    const notificationPayload = studentIds.map(sid => ({
      userId: sid,
      title: 'Grades Published',
      message: `Your final grade for ${courseCode} has been published.`,
      link: '/student/results'
    }));
    await sendBulkNotifications(notificationPayload);
    
    return success(res, { published: enrollments.length }, 'Grades published successfully');
  } catch (err) { next(err); }
}

async function getGradeStatus(req, res, next) {
  try {
    const deptId = req.user.deptId;
    
    // Find active semester
    const [activeSem] = await pool.query('SELECT semester_id FROM semester WHERE dept_id=? AND is_active=1 LIMIT 1', [deptId]);
    if (!activeSem.length) return success(res, []);
    
    const [offerings] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.course_name, t.name as teacher_name
      FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      LEFT JOIN teacher t ON co.teacher_id = t.teacher_id
      WHERE co.semester_id = ?
    `, [activeSem[0].semester_id]);
    
    // For each offering, calculate status
    const statuses = await Promise.all(offerings.map(async (off) => {
      const [enrollments] = await pool.query('SELECT enrollment_id, grade_point, is_published FROM enrollment WHERE offering_id = ? AND status IN ("Registered", "Completed")', [off.offering_id]);
      
      const total = enrollments.length;
      if (total === 0) return { ...off, status: 'Not Started', gradedCount: 0, totalCount: 0 };
      
      const published = enrollments.filter(e => e.is_published === 1).length;
      const graded = enrollments.filter(e => e.grade_point !== null).length;
      
      let status = 'Not Started';
      if (published === total) status = 'Published';
      else if (published > 0 && published < total) status = 'Partially Published'; // shouldn't happen usually
      else if (graded === total) status = 'Draft Saved';
      else if (graded > 0) status = 'In Progress';
      
      return {
        ...off,
        semester_id: activeSem[0].semester_id,
        status,
        gradedCount: graded,
        totalCount: total
      };
    }));
    
    return success(res, statuses);
  } catch (err) { next(err); }
}

async function bulkUpdateGrades(req, res, next) {
  try {
    const { offeringId } = req.params;
    const { grades } = req.body; // grades: [{enrollment_id, grade_point, grade_letter}]
    if (!grades) return badRequest(res, 'No grades provided');
    
    let updated = 0;
    for (const g of grades) {
      if (g.grade_point !== null && g.grade_point !== '') {
        await pool.query(
          'UPDATE enrollment SET grade_point = ?, grade_letter = ?, status = "Completed", is_published = 1 WHERE enrollment_id = ?', 
          [parseFloat(g.grade_point), g.grade_letter, g.enrollment_id]
        );
        updated++;
        // Recalculate CGPA immediately since we are bypassing the publish workflow
        const [enr] = await pool.query('SELECT student_id FROM enrollment WHERE enrollment_id = ?', [g.enrollment_id]);
        if (enr.length > 0) {
          await recalculateCGPA(enr[0].student_id);
        }
      }
    }
    
    return success(res, { updated }, 'Grades saved successfully');
  } catch (err) { next(err); }
}

async function getBatchCourseGrades(req, res, next) {
  try {
    const { session, level, term, courseId } = req.params;
    const deptId = req.user.deptId;
    
    // 1. Get all students in this session for this dept
    const [students] = await pool.query('SELECT student_id, name, batch, session FROM student WHERE dept_id=? AND session=? ORDER BY student_id', [deptId, session]);
    
    // 2. Get enrollments for this course, level, term
    // Since course_offering defines the course_id, we need to join it.
    const [enrollments] = await pool.query(`
      SELECT e.enrollment_id, e.student_id, e.grade_point, e.grade_letter, e.status
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.level = ? AND e.term = ? AND co.course_id = ?
    `, [level, term, courseId]);
    
    // Merge
    const merged = students.map(s => {
      const enr = enrollments.find(e => e.student_id === s.student_id);
      return {
        ...s,
        enrollment_id: enr ? enr.enrollment_id : null,
        grade_point: enr ? enr.grade_point : null,
        grade_letter: enr ? enr.grade_letter : null,
        status: enr ? enr.status : 'Not Registered'
      };
    });
    
    return success(res, merged);
  } catch (err) { next(err); }
}

module.exports = {
  getCourseGrades,
  saveSingleGrade,
  bulkUploadPreview,
  bulkUploadConfirm,
  publishGrades,
  getGradeStatus,
  bulkUpdateGrades,
  getBatchCourseGrades
};
