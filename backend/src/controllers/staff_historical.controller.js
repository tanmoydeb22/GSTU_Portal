const pool = require('../config/db');
const { success, badRequest, notFound } = require('../utils/response');
const { recalculateCGPA } = require('../services/cgpa.service');
const ExcelJS = require('exceljs');
const fs = require('fs');

async function getClosedSemesters(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM semester WHERE dept_id=? AND is_active=0 ORDER BY academic_year DESC, level ASC, term ASC',
      [req.user.deptId]
    );
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getHistoricalOfferings(req, res, next) {
  try {
    const { semesterId } = req.params;
    const [offerings] = await pool.query(`
      SELECT 
        co.*, c.course_code, c.course_name, c.dept_id as course_dept_id, 
        d.dept_code as course_dept_code,
        t.teacher_id, t.name as teacher_name
      FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      JOIN department d ON c.dept_id = d.dept_id
      LEFT JOIN teacher t ON co.teacher_id = t.teacher_id
      WHERE co.semester_id = ?
      ORDER BY c.offered_level ASC, c.offered_term ASC, c.course_code ASC
    `, [semesterId]);
    
    const processedOfferings = offerings.map(o => ({
      ...o,
      is_cross_dept: o.course_dept_id !== req.user.deptId
    }));
    
    // Get all teachers in the system grouped by department
    const [teachers] = await pool.query(`SELECT teacher_id, name, dept_id FROM teacher`);
    const teachersByDept = {};
    
    teachers.forEach(t => {
      if (!teachersByDept[t.dept_id]) teachersByDept[t.dept_id] = [];
      teachersByDept[t.dept_id].push(t);
    });

    return success(res, { offerings: processedOfferings, teachersByDept });
  } catch (err) { next(err); }
}

async function assignTeachers(req, res, next) {
  try {
    const { semesterId } = req.params;
    const assignments = req.body; // Array of { offering_id, teacher_id }
    
    if (!Array.isArray(assignments)) return badRequest(res, 'Invalid format');

    for (const assignment of assignments) {
      await pool.query(
        'UPDATE course_offering SET teacher_id=? WHERE offering_id=? AND semester_id=?',
        [assignment.teacher_id || null, assignment.offering_id, semesterId]
      );
    }
    return success(res, null, 'Teachers assigned successfully');
  } catch (err) { next(err); }
}

async function bulkEnroll(req, res, next) {
  try {
    const { semesterId } = req.params;
    const { student_ids } = req.body;
    
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return badRequest(res, 'Student IDs are required');
    }

    const [offerings] = await pool.query('SELECT offering_id FROM course_offering WHERE semester_id = ?', [semesterId]);
    if (offerings.length === 0) return badRequest(res, 'No course offerings found for this semester');

    const [semester] = await pool.query('SELECT level, term FROM semester WHERE semester_id = ?', [semesterId]);
    if (semester.length === 0) return notFound(res, 'Semester not found');

    const enrollments = [];
    for (const studentId of student_ids) {
      for (const offering of offerings) {
        enrollments.push([
          studentId,
          offering.offering_id,
          semester[0].level,
          semester[0].term,
          'Regular',
          'Completed'
        ]);
      }
    }

    if (enrollments.length > 0) {
      await pool.query(`
        INSERT IGNORE INTO enrollment
          (student_id, offering_id, level, term, enrollment_type, status)
        VALUES ?
      `, [enrollments]);
    }

    return success(res, { enrolled: enrollments.length }, 'Students enrolled successfully');
  } catch (err) { next(err); }
}

async function getMarksTemplate(req, res, next) {
  try {
    const { semesterId } = req.params;
    
    const [courses] = await pool.query(`
      SELECT co.offering_id, c.course_code 
      FROM course_offering co 
      JOIN course c ON co.course_id = c.course_id 
      WHERE co.semester_id = ? ORDER BY c.offered_level ASC, c.offered_term ASC, c.course_code ASC
    `, [semesterId]);

    const [enrollments] = await pool.query(`
      SELECT DISTINCT student_id FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE co.semester_id = ? ORDER BY student_id ASC
    `, [semesterId]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historical Grades');

    const columns = [{ header: 'student_id', key: 'student_id', width: 20 }];
    courses.forEach(c => {
      columns.push({ header: c.course_code, key: c.course_code, width: 15 });
    });
    worksheet.columns = columns;

    enrollments.forEach(e => {
      worksheet.addRow({ student_id: e.student_id });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=historical_grades_template.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

async function bulkGradeEntry(req, res, next) {
  try {
    const { semesterId } = req.params;
    
    if (!req.file) return badRequest(res, 'Excel file required');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet(1);
    
    const headers = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value.trim();
    });

    const gradesData = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const studentData = { student_id: '', grades: {} };
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header === 'student_id') {
          studentData.student_id = cell.value?.toString().trim();
        } else if (header) {
          studentData.grades[header] = cell.value?.toString().trim().toUpperCase();
        }
      });
      if (studentData.student_id) {
        gradesData.push(studentData);
      }
    });

    // delete temp file
    fs.unlink(req.file.path, () => {});

    const [gradingScaleRows] = await pool.query('SELECT * FROM grading_scale');
    const gradingScale = gradingScaleRows;

    const errors = [];
    const updates = [];

    for (const row of gradesData) {
      for (const [courseCode, gradeLetter] of Object.entries(row.grades)) {
        if (!gradeLetter) continue; // skip empty cells

        const scale = gradingScale.find(s => s.grade_letter === gradeLetter);
        if (!scale) {
          errors.push(`${row.student_id}: Invalid grade "${gradeLetter}" for ${courseCode}`);
          continue;
        }

        const [enrollment] = await pool.query(`
          SELECT e.enrollment_id FROM enrollment e
          JOIN course_offering co ON e.offering_id = co.offering_id
          JOIN course c ON co.course_id = c.course_id
          WHERE e.student_id = ? AND c.course_code = ? AND co.semester_id = ?
        `, [row.student_id, courseCode, semesterId]);

        if (enrollment.length === 0) {
          errors.push(`${row.student_id}: Not enrolled in ${courseCode}`);
          continue;
        }

        updates.push([
          scale.grade_point,
          gradeLetter,
          enrollment[0].enrollment_id
        ]);
      }
    }

    if (errors.length > 0 && updates.length === 0) {
      return badRequest(res, 'Validation failed', errors);
    }

    for (const [gp, gl, eid] of updates) {
      await pool.query(`
        UPDATE enrollment
        SET grade_point = ?, grade_letter = ?, status = 'Completed', is_published = 1
        WHERE enrollment_id = ?
      `, [gp, gl, eid]);
    }

    const studentIds = [...new Set(gradesData.map(r => r.student_id))];
    for (const sid of studentIds) {
      await recalculateCGPA(sid);
    }

    await pool.query(`
      UPDATE semester SET result_status = 'Published' WHERE semester_id = ?
    `, [semesterId]);

    return success(res, { updated: updates.length, errors }, 'Grades processed');
  } catch (err) { next(err); }
}

async function getStatus(req, res, next) {
  try {
    const { semesterId } = req.params;
    
    // Offerings stats
    const [offerings] = await pool.query(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN co.teacher_id IS NOT NULL OR LOWER(c.course_name) LIKE '%viva%' THEN 1 ELSE 0 END) as assigned 
      FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      WHERE co.semester_id=?
    `, [semesterId]);
    
    // Enrollment stats
    const [enrollments] = await pool.query('SELECT COUNT(DISTINCT student_id) as students, COUNT(*) as total_records FROM enrollment e JOIN course_offering co ON e.offering_id = co.offering_id WHERE co.semester_id=?', [semesterId]);
    
    // Grade stats
    const [grades] = await pool.query('SELECT COUNT(DISTINCT student_id) as students, COUNT(*) as total_records FROM enrollment e JOIN course_offering co ON e.offering_id = co.offering_id WHERE co.semester_id=? AND grade_letter IS NOT NULL', [semesterId]);

    return success(res, {
      offerings_total: offerings[0].total,
      teachers_assigned: offerings[0].assigned,
      students_enrolled: enrollments[0].students,
      enrollment_records: enrollments[0].total_records,
      students_with_grades: grades[0].students,
      grade_records: grades[0].total_records
    });
  } catch (err) { next(err); }
}

module.exports = {
  getClosedSemesters,
  getHistoricalOfferings,
  assignTeachers,
  bulkEnroll,
  getMarksTemplate,
  bulkGradeEntry,
  getStatus
};
