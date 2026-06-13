const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { success, created, error, badRequest, notFound } = require('../utils/response');
const { generateTempPassword } = require('../services/auth.service');
const { generateStudentId } = require('../utils/generateStudentId');
const { generateStudentPassword } = require('../utils/passwordGenerator');
const { gradePointToLetter } = require('../utils/gradeMapper');
const { validateStudentCSV, validateTeacherCSV, removeUploadedFile } = require('../services/csv.service');
const { recalculateCGPA, recalculateBulkCGPA } = require('../services/cgpa.service');
const { sendNotification, sendBulkNotifications } = require('../services/notification.service');
const { attachSchedules } = require('../services/schedule.service');

// --- DEPARTMENTS ---
async function getDepartments(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT dept_id, dept_code, dept_name FROM department ORDER BY dept_name');
    return success(res, rows);
  } catch (err) { next(err); }
}

// --- TEACHERS ---
async function getTeachers(req, res, next) {
  try {
    let deptId = req.user.deptId;
    const { designation, is_active, search, course_id, page = 1, limit = 25 } = req.query;
    
    if (course_id) {
      const [courseRows] = await pool.query('SELECT dept_id FROM course WHERE course_id = ?', [course_id]);
      if (courseRows.length > 0) {
        deptId = courseRows[0].dept_id;
      }
    }

    let q = `SELECT t.teacher_id, t.teacher_code, t.name, t.email, t.phone, t.designation, t.is_active FROM teacher t WHERE t.dept_id = ?`;
    const p = [deptId];
    if (designation) { q += ' AND t.designation = ?'; p.push(designation); }
    if (is_active !== undefined) { q += ' AND t.is_active = ?'; p.push(is_active); }
    if (search) { q += ' AND (t.name LIKE ? OR t.teacher_code LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    const cQ = 'SELECT COUNT(*) as total FROM teacher t WHERE ' + q.split('WHERE')[1];
    const [cR] = await pool.query(cQ, p);
    q += ' ORDER BY t.teacher_code LIMIT ? OFFSET ?';
    p.push(parseInt(limit), (page - 1) * limit);
    const [rows] = await pool.query(q, p);
    return success(res, { teachers: rows, total: cR[0].total, page: parseInt(page), totalPages: Math.ceil(cR[0].total / limit) });
  } catch (err) { next(err); }
}

async function createTeacher(req, res, next) {
  try {
    const { teacher_code, name, email, phone, designation } = req.body;
    const tempPw = generateTempPassword('Teacher');
    const hash = await bcrypt.hash(tempPw, 10);
    const [result] = await pool.query(
      `INSERT INTO teacher (teacher_code, name, email, phone, designation, dept_id, password, must_change_password, is_active) VALUES (?,?,?,?,?,?,?,1,1)`,
      [teacher_code, name, email, phone, designation, req.user.deptId, hash]
    );
    return created(res, { teacher_id: result.insertId, teacher_code, name, tempPassword: tempPw });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Teacher code or email exists'); next(err); }
}

async function updateTeacher(req, res, next) {
  try {
    const { name, email, phone, designation, is_active } = req.body;
    const f = [], p = [];
    if (name !== undefined) { f.push('name=?'); p.push(name); }
    if (email !== undefined) { f.push('email=?'); p.push(email); }
    if (phone !== undefined) { f.push('phone=?'); p.push(phone); }
    if (designation !== undefined) { f.push('designation=?'); p.push(designation); }
    if (is_active !== undefined) { f.push('is_active=?'); p.push(is_active); }
    if (!f.length) return badRequest(res, 'No fields to update');
    p.push(req.params.id, req.user.deptId);
    const [r] = await pool.query(`UPDATE teacher SET ${f.join(',')} WHERE teacher_id=? AND dept_id=?`, p);
    if (r.affectedRows === 0) return notFound(res, 'Teacher not found');
    return success(res, null, 'Teacher updated');
  } catch (err) { next(err); }
}

async function deleteTeacher(req, res, next) {
  try {
    const [r] = await pool.query('DELETE FROM teacher WHERE teacher_id=? AND dept_id=?', [req.params.id, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res, 'Teacher not found');
    return success(res, null, 'Teacher deleted');
  } catch (err) { next(err); }
}

async function resetTeacherPassword(req, res, next) {
  try {
    const tempPassword = generateTempPassword('Teacher');
    const hash = await bcrypt.hash(tempPassword, 10);
    const [r] = await pool.query('UPDATE teacher SET password=?, must_change_password=1, login_attempts=0, locked_until=NULL WHERE teacher_id=? AND dept_id=?', [hash, req.params.id, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res);
    return res.json({
      success: true,
      data: { temp_password: tempPassword },
      message: 'Password reset successfully. Share this new password directly.'
    });
  } catch (err) { next(err); }
}

// --- STUDENTS ---
async function getStudents(req, res, next) {
  try {
    const deptId = req.user.deptId;
    const { session, level, term, is_active, student_status, search, sort_by, all, page = 1, limit = 25 } = req.query;
    let q = `SELECT s.student_id, s.name, s.email, s.phone, s.batch, s.session, s.level, s.term, s.cgpa, s.total_credit_completed, s.is_active, s.student_status, s.photo_url, s.guardian_name, s.guardian_phone FROM student s WHERE s.dept_id=?`;
    const p = [deptId];
    if (session) { q += ' AND s.session=?'; p.push(session); }
    if (level) { q += ' AND s.level=?'; p.push(level); }
    if (term) { q += ' AND s.term=?'; p.push(term); }
    if (is_active !== undefined) { q += ' AND s.is_active=?'; p.push(is_active); }
    if (student_status) { q += ' AND s.student_status=?'; p.push(student_status); }
    if (search) { q += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    
    const cQ = 'SELECT COUNT(*) as total FROM student s WHERE ' + q.split('WHERE')[1];
    const [cR] = await pool.query(cQ, p);
    
    // Default sorting - handle re-added students by sorting by ID year prefix DESC
    // This ensures e.g. 24CSE (regular) comes before 23CSE (re-add) in the same session
    let orderClause = ' ORDER BY s.session DESC, SUBSTRING(s.student_id, 1, 2) DESC, s.student_id ASC';
    if (sort_by === 'cgpa_desc') orderClause = ' ORDER BY s.cgpa DESC, s.student_id ASC';
    else if (sort_by === 'cgpa_asc') orderClause = ' ORDER BY s.cgpa ASC, s.student_id ASC';
    else if (sort_by === 'name') orderClause = ' ORDER BY s.name ASC';
    else if (sort_by === 'id') orderClause = ' ORDER BY s.student_id ASC';
    else if (sort_by === 'session') orderClause = ' ORDER BY s.session DESC, SUBSTRING(s.student_id, 1, 2) DESC, s.student_id ASC';

    q += orderClause;

    if (all !== 'true') {
      q += ' LIMIT ? OFFSET ?';
      p.push(parseInt(limit), (page - 1) * limit);
    }
    
    const [rows] = await pool.query(q, p);
    return success(res, { students: rows, total: cR[0].total, page: parseInt(page), totalPages: Math.ceil(cR[0].total / limit) });
  } catch (err) { next(err); }
}

async function getStudentDetail(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM student WHERE student_id=? AND dept_id=?', [req.params.studentId, req.user.deptId]);
    if (!rows.length) {
      return notFound(res, 'Student not found');
    }
    
    const { password, cgpa, total_credit_completed, ...student } = rows[0];
    
    const [semesterRows] = await pool.query(`
      SELECT 
        s.semester_id,
        s.academic_year,
        s.level,
        s.term,
        COUNT(e.enrollment_id) > 0 AS is_registered,
        p.status AS payment_status,
        p.total_amount AS payment_amount,
        s.result_status
      FROM semester s
      LEFT JOIN course_offering co ON co.semester_id = s.semester_id
      LEFT JOIN enrollment e ON e.offering_id = co.offering_id 
        AND e.student_id = ?
      LEFT JOIN payment p ON p.semester_id = s.semester_id 
        AND p.student_id = ?
      WHERE s.dept_id = ? 
        AND s.is_active = 1
      GROUP BY s.semester_id, p.status, p.total_amount, s.result_status
      LIMIT 1
    `, [req.params.studentId, req.params.studentId, req.user.deptId]);

    const [deptRows] = await pool.query('SELECT dept_name FROM department WHERE dept_id=?', [req.user.deptId]);
    student.dept_name = deptRows.length ? deptRows[0].dept_name : '';
    
    // Fix boolean for MySQL COUNT() > 0 which returns 1 or 0
    if (semesterRows.length > 0) {
      semesterRows[0].is_registered = !!semesterRows[0].is_registered;
    }

    return success(res, { student, current_semester: semesterRows[0] || null });
  } catch (err) {
    console.error(`[getStudentDetail] Error:`, err);
    next(err);
  }
}

async function createStudent(req, res, next) {
  try {
    const { student_id, name, email, phone, batch, session, level, term, address } = req.body;
    const tempPassword = generateStudentPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await pool.query(`INSERT INTO student (student_id, name, email, phone, batch, session, level, term, address, dept_id, password, must_change_password, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1)`,
      [student_id, name, email, phone, batch, session, level, term, address || null, req.user.deptId, hash]);
    return res.json({
      success: true,
      data: { student_id, name, temp_password: tempPassword },
      message: 'Student created successfully. Share this password directly.'
    });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Student ID exists'); next(err); }
}

async function updateStudent(req, res, next) {
  try {
    const { name, email, phone, address, is_active, batch, session, level, term, guardian_name, guardian_phone, blood_group } = req.body;
    const f = [], p = [];
    if (name !== undefined) { f.push('name=?'); p.push(name); }
    if (email !== undefined) { f.push('email=?'); p.push(email); }
    if (phone !== undefined) { f.push('phone=?'); p.push(phone); }
    if (address !== undefined) { f.push('address=?'); p.push(address); }
    if (is_active !== undefined) { f.push('is_active=?'); p.push(is_active); }
    if (batch !== undefined) { f.push('batch=?'); p.push(batch); }
    if (session !== undefined) { f.push('session=?'); p.push(session); }
    if (level !== undefined) { f.push('level=?'); p.push(level); }
    if (term !== undefined) { f.push('term=?'); p.push(term); }
    if (guardian_name !== undefined) { f.push('guardian_name=?'); p.push(guardian_name); }
    if (guardian_phone !== undefined) { f.push('guardian_phone=?'); p.push(guardian_phone); }
    if (blood_group !== undefined) { f.push('blood_group=?'); p.push(blood_group); }

    if (!f.length) return badRequest(res, 'No fields');
    p.push(req.params.studentId, req.user.deptId);
    const [r] = await pool.query(`UPDATE student SET ${f.join(',')} WHERE student_id=? AND dept_id=?`, p);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Student updated');
  } catch (err) { next(err); }
}

async function deleteStudent(req, res, next) {
  try {
    // Check if student has any enrollments before deleting
    const [enrollments] = await pool.query('SELECT COUNT(*) as c FROM enrollment WHERE student_id=?', [req.params.studentId]);
    if (enrollments[0].c > 0) return badRequest(res, 'Cannot delete: student has enrollment records');
    
    const [r] = await pool.query('DELETE FROM student WHERE student_id=? AND dept_id=?', [req.params.studentId, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Student deleted');
  } catch (err) { next(err); }
}

async function advanceStudent(req, res, next) {
  try {
    const { level, term } = req.body;
    const [r] = await pool.query('UPDATE student SET level=?, term=? WHERE student_id=? AND dept_id=?', [level, term, req.params.studentId, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Student advanced');
  } catch (err) { next(err); }
}

async function changeStudentStatus(req, res, next) {
  try {
    const { student_status } = req.body;
    const [r] = await pool.query('UPDATE student SET student_status=? WHERE student_id=? AND dept_id=?', [student_status, req.params.studentId, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Student status updated');
  } catch (err) { next(err); }
}

async function resetStudentPassword(req, res, next) {
  try {
    const tempPassword = generateStudentPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    const [r] = await pool.query('UPDATE student SET password=?, must_change_password=1, login_attempts=0, locked_until=NULL WHERE student_id=? AND dept_id=?', [hash, req.params.studentId, req.user.deptId]);
    if (r.affectedRows === 0) return notFound(res);
    return res.json({
      success: true,
      data: { temp_password: tempPassword },
      message: 'Password reset successfully. Share this new password directly.'
    });
  } catch (err) { next(err); }
}

async function exportStudentsExcel(req, res, next) {
  try {
    const ExcelJS = require('exceljs');
    const deptId = req.user.deptId;
    const { batch, level, term, is_active, student_status, search } = req.query;
    
    let q = `SELECT s.student_id, s.name, s.email, s.phone, s.batch, s.level, s.term, s.cgpa, s.total_credit_completed, s.student_status FROM student s WHERE s.dept_id=?`;
    const p = [deptId];
    if (batch) { q += ' AND s.batch=?'; p.push(batch); }
    if (level) { q += ' AND s.level=?'; p.push(level); }
    if (term) { q += ' AND s.term=?'; p.push(term); }
    if (is_active !== undefined) { q += ' AND s.is_active=?'; p.push(is_active); }
    if (student_status) { q += ' AND s.student_status=?'; p.push(student_status); }
    if (search) { q += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    
    q += ' ORDER BY s.batch DESC, s.student_id ASC';
    const [rows] = await pool.query(q, p);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    worksheet.columns = [
      { header: 'Student ID', key: 'student_id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Batch', key: 'batch', width: 10 },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Term', key: 'term', width: 10 },
      { header: 'CGPA', key: 'cgpa', width: 10 },
      { header: 'Credits', key: 'total_credit_completed', width: 15 },
      { header: 'Status', key: 'student_status', width: 15 }
    ];

    rows.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

async function bulkAdvanceStudents(req, res, next) {
  try {
    const { session } = req.body;
    if (!session) return badRequest(res, 'Session is required');

    // Get current level/term of this session
    const [students] = await pool.query('SELECT level, term FROM student WHERE session=? AND dept_id=? AND student_status="Active" LIMIT 1', [session, req.user.deptId]);
    
    if (students.length === 0) {
        return badRequest(res, 'No active students found in this session');
    }
    
    const current_level = students[0].level;
    const current_term = students[0].term;
    
    let next_level = current_level;
    let next_term = current_term;
    let isGraduating = false;
    
    if (current_term === 1) {
        next_term = 2;
    } else if (current_level < 4) {
        next_level = current_level + 1;
        next_term = 1;
    } else {
        isGraduating = true;
    }
    
    let query;
    let params;
    
    if (isGraduating) {
        query = 'UPDATE student SET student_status="Graduated" WHERE session=? AND dept_id=? AND student_status="Active"';
        params = [session, req.user.deptId];
    } else {
        query = 'UPDATE student SET level=?, term=? WHERE session=? AND dept_id=? AND student_status="Active"';
        params = [next_level, next_term, session, req.user.deptId];
    }
    
    const [r] = await pool.query(query, params);

    // Audit Log
    if (r.affectedRows > 0) {
      await pool.query(
        'INSERT INTO audit_log (action, details, user_id) VALUES (?, ?, ?)',
        ['Session Promote', `Promoted ${r.affectedRows} students in session ${session} to ${isGraduating ? 'Graduated' : `L${next_level}T${next_term}`}`, req.user.userId]
      );
    }

    return success(res, { advanced: r.affectedRows }, 'Students advanced in bulk');
  } catch (err) { next(err); }
}

async function bulkUploadStudents(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'CSV file required');
    const result = validateStudentCSV(req.file.path);
    if (result.errors.length > 0) { removeUploadedFile(req.file.path); return badRequest(res, 'CSV validation failed', result.errors); }
    
    let inserted = 0; 
    const errors = [];
    const credentialsList = [];

    for (const row of result.data) {
      try {
        const tempPassword = generateStudentPassword();
        const hash = await bcrypt.hash(tempPassword, 10);
        await pool.query(`INSERT INTO student (student_id,name,email,phone,batch,session,level,term,address,dept_id,password,must_change_password,is_active) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,1)`,
          [row.student_id, row.name, row.email, row.phone, row.batch, row.session, row.level, row.term, row.address || null, req.user.deptId, hash]);
        inserted++;
        credentialsList.push({
          student_id: row.student_id,
          name: row.name,
          email: row.email,
          temp_password: tempPassword
        });
      } catch (e) { errors.push({ student_id: row.student_id, error: e.code === 'ER_DUP_ENTRY' ? 'Duplicate' : e.message }); }
    }
    removeUploadedFile(req.file.path);
    return res.json({
      success: true,
      data: {
        inserted,
        failed: errors.length,
        errors,
        credentials: credentialsList
      },
      message: 'Bulk upload completed'
    });
  } catch (err) { if (req.file) removeUploadedFile(req.file.path); next(err); }
}

// --- COURSES ---
async function getCourses(req, res, next) {
  try {
    const { offered_level, offered_term, course_type, all, includeViva } = req.query;
    let q = 'SELECT * FROM course WHERE 1=1';
    const p = [];

    // Filter out Viva courses unless specifically requested
    if (includeViva !== 'true') {
      q += ' AND course_type != "Viva"';
    }

    // Default: only show department's own courses
    if (all !== 'true') {
      q += ' AND dept_id = ?';
      p.push(req.user.deptId);
    }

    if (offered_level) { q += ' AND offered_level=?'; p.push(offered_level); }
    if (offered_term) { q += ' AND offered_term=?'; p.push(offered_term); }
    if (course_type) { q += ' AND course_type=?'; p.push(course_type); }
    
    q += ' ORDER BY course_code';
    const [rows] = await pool.query(q, p);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function createCourse(req, res, next) {
  try {
    const { course_code, course_name, credit, offered_level, offered_term, course_type, description, dept_id } = req.body;
    const finalDeptId = dept_id || req.user.deptId;
    const [r] = await pool.query(`INSERT INTO course (course_code,course_name,credit,offered_level,offered_term,course_type,description,dept_id) VALUES(?,?,?,?,?,?,?,?)`,
      [course_code, course_name, credit, offered_level, offered_term, course_type, description || null, finalDeptId]);
    return created(res, { course_id: r.insertId, course_code });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Course code exists'); next(err); }
}

async function updateCourse(req, res, next) {
  try {
    const { course_code, course_name, credit, offered_level, offered_term, course_type, description, dept_id } = req.body;
    const f = [], p = [];
    if (course_code !== undefined) { f.push('course_code=?'); p.push(course_code); }
    if (course_name !== undefined) { f.push('course_name=?'); p.push(course_name); }
    if (credit !== undefined) { f.push('credit=?'); p.push(credit); }
    if (offered_level !== undefined) { f.push('offered_level=?'); p.push(offered_level); }
    if (offered_term !== undefined) { f.push('offered_term=?'); p.push(offered_term); }
    if (course_type !== undefined) { f.push('course_type=?'); p.push(course_type); }
    if (description !== undefined) { f.push('description=?'); p.push(description); }
    if (dept_id !== undefined) { f.push('dept_id=?'); p.push(dept_id); }
    if (!f.length) return badRequest(res, 'No fields');
    p.push(req.params.id);
    
    // Allow updating cross-department courses by any staff member for now
    const [r] = await pool.query(`UPDATE course SET ${f.join(',')} WHERE course_id=?`, p);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Course updated');
  } catch (err) { 
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Course code exists'); 
    next(err); 
  }
}

async function deleteCourse(req, res, next) {
  try {
    const [offerings] = await pool.query('SELECT COUNT(*) as c FROM course_offering WHERE course_id=?', [req.params.id]);
    if (offerings[0].c > 0) return badRequest(res, 'Cannot delete: course has offerings');
    const [r] = await pool.query('DELETE FROM course WHERE course_id=?', [req.params.id]);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Course deleted');
  } catch (err) { next(err); }
}

// --- SEMESTERS ---
async function getSemesters(req, res, next) {
  try {
    const { student_session } = req.query;
    let query = `
      SELECT s.*, 
        (SELECT COUNT(DISTINCT e.student_id) 
         FROM enrollment e 
         JOIN course_offering co ON e.offering_id=co.offering_id 
         WHERE co.semester_id=s.semester_id) AS student_count,
        (SELECT COUNT(*) FROM course_offering WHERE semester_id=s.semester_id) AS offering_count,
        COALESCE((SELECT SUM(c.credit) FROM course_offering co 
         JOIN course c ON co.course_id=c.course_id 
         WHERE co.semester_id=s.semester_id), 0) AS fixed_credit
      FROM semester s 
      WHERE s.dept_id=? 
    `;
    const params = [req.user.deptId];

    if (student_session) {
      query = `
        SELECT DISTINCT s.*,
        0 AS student_count, 0 AS offering_count, 0 AS fixed_credit
        FROM semester s
        JOIN course_offering co ON s.semester_id = co.semester_id
        JOIN enrollment e ON co.offering_id = e.offering_id
        JOIN student st ON e.student_id = st.student_id
        WHERE s.dept_id=? AND st.session=?
        ORDER BY s.academic_year DESC, s.level ASC, s.term ASC
      `;
      params.push(student_session);
    } else {
      query += ` ORDER BY s.reg_start DESC, s.semester_id DESC`;
    }

    const [rows] = await pool.query(query, params);
    
    const result = rows.map(r => {
      return {
        ...r,
        total_credit: parseFloat(r.fixed_credit) || 0
      };
    });
    return success(res, result);
  } catch (err) { next(err); }
}

async function createSemester(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { academic_year, level, term, reg_start, reg_end } = req.body;
    
    await connection.beginTransaction();

    const [r] = await connection.query(`INSERT INTO semester (academic_year,level,term,reg_start,reg_end,dept_id,is_active) VALUES(?,?,?,?,?,?,0)`,
      [academic_year, level, term, reg_start, reg_end, req.user.deptId]);

    // Automatically create Viva offering if a Viva course exists for this specific level/term
    const [vivaCourse] = await connection.query('SELECT course_id FROM course WHERE dept_id = ? AND offered_level = ? AND offered_term = ? AND course_type = \'Viva\'', [req.user.deptId, level, term]);
    
    if (vivaCourse.length > 0) {
      await connection.query('INSERT IGNORE INTO course_offering (course_id, semester_id) VALUES (?, ?)', [vivaCourse[0].course_id, r.insertId]);
    }

    await connection.commit();
    return created(res, { semester_id: r.insertId });
  } catch (err) { 
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'A semester with this year, level, and term already exists');
    next(err); 
  } finally {
    connection.release();
  }
}

async function updateSemester(req, res, next) {
  try {
    const { academic_year, level, term, reg_start, reg_end, is_locked } = req.body;
    const f = [], p = [];
    if (academic_year !== undefined) { f.push('academic_year=?'); p.push(academic_year); }
    if (level !== undefined) { f.push('level=?'); p.push(level); }
    if (term !== undefined) { f.push('term=?'); p.push(term); }
    if (reg_start !== undefined) { f.push('reg_start=?'); p.push(reg_start); }
    if (reg_end !== undefined) { f.push('reg_end=?'); p.push(reg_end); }
    if (is_locked !== undefined) { f.push('is_locked=?'); p.push(is_locked); }
    if (!f.length) return badRequest(res, 'No fields');
    p.push(req.params.id, req.user.deptId);
    const [r] = await pool.query(`UPDATE semester SET ${f.join(',')} WHERE semester_id=? AND dept_id=?`, p);
    if (r.affectedRows === 0) return notFound(res, 'Semester not found or you don\'t have permission');
    return success(res, null, 'Semester updated');
  } catch (err) { 
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Conflict: Another semester already uses this year, level, and term');
    console.error('Update Semester Error:', err);
    return res.status(500).json({ error: err.message }); 
  }
}

async function deleteSemester(req, res, next) {
  try {
    const semesterId = req.params.id;
    const deptId = req.user.deptId;

    const [sem] = await pool.query('SELECT * FROM semester WHERE semester_id=? AND dept_id=?', [semesterId, deptId]);
    if (!sem.length) {
      return notFound(res, 'Semester not found or permission denied');
    }

    const [enrollments] = await pool.query(
      `SELECT COUNT(*) as count FROM enrollment e 
       JOIN course_offering co ON e.offering_id = co.offering_id 
       WHERE co.semester_id = ?`,
      [semesterId]
    );

    if (enrollments[0].count > 0) {
      return badRequest(res, 'Cannot delete semester because it already has active student enrollments');
    }

    // Delete any course offerings first (including auto-generated Viva course offerings) since there are no enrollments
    await pool.query('DELETE FROM course_offering WHERE semester_id = ?', [semesterId]);

    const [r] = await pool.query('DELETE FROM semester WHERE semester_id=? AND dept_id=?', [semesterId, deptId]);
    if (r.affectedRows === 0) return notFound(res);

    return success(res, null, 'Semester deleted successfully');
  } catch (err) {
    next(err);
  }
}

async function toggleSemester(req, res, next) {
  try {
    const [sem] = await pool.query('SELECT * FROM semester WHERE semester_id=? AND dept_id=?', [req.params.id, req.user.deptId]);
    if (!sem.length) return notFound(res);
    const newStatus = sem[0].is_active ? 0 : 1;
    if (newStatus === 1) {
      // Check if registration time has already ended
      const currentDate = new Date();
      const regEnd = new Date(sem[0].reg_end);
      
      currentDate.setHours(0,0,0,0);
      regEnd.setHours(0,0,0,0);
      
      if (currentDate > regEnd) {
        return badRequest(res, `Cannot open registration because the registration period has already ended on ${sem[0].reg_end.toISOString().slice(0, 10)}.`);
      }

      await pool.query('UPDATE semester SET is_active=0 WHERE dept_id=? AND level=? AND term=? AND semester_id!=?', [req.user.deptId, sem[0].level, sem[0].term, req.params.id]);
      await pool.query('UPDATE semester SET is_active=1, is_locked=0 WHERE semester_id=?', [req.params.id]);

      // Notify all students in this department that registration has opened
      sendNotification({
        userId: null,
        userType: 'student',
        deptId: req.user.deptId,
        title: 'Registration Now Open',
        message: `Semester registration for Level ${sem[0].level} Term ${sem[0].term} (${sem[0].academic_year}) is now open. Register before ${new Date(sem[0].reg_end).toLocaleDateString()}.`,
        type: 'success',
        link: '/student/registration',
      }).catch(err => console.error('[Notif] toggleSemester open:', err.message));
    } else {
      await pool.query('UPDATE semester SET is_active=0 WHERE semester_id=?', [req.params.id]);

      // Notify all enrolled students that registration has closed
      const [enrolled] = await pool.query(`
        SELECT DISTINCT e.student_id FROM enrollment e
        JOIN course_offering co ON e.offering_id = co.offering_id
        WHERE co.semester_id = ? AND e.status IN ('Registered', 'Completed')
      `, [req.params.id]);

      const studentIds = enrolled.map(r => r.student_id);
      if (studentIds.length > 0) {
        sendBulkNotifications(studentIds, 'student', {
          title: 'Registration Closed',
          message: `Registration for L${sem[0].level}T${sem[0].term} (${sem[0].academic_year}) has been closed by the Section Officer.`,
          type: 'warning',
          link: '/student/my-courses',
        }).catch(err => console.error('[Notif] toggleSemester close:', err.message));
      }
    }
    return success(res, { is_active: newStatus }, newStatus ? 'Registration opened' : 'Registration closed');
  } catch (err) { next(err); }
}

// --- COURSE OFFERINGS ---
async function getOfferings(req, res, next) {
  try {
    const { semester_id } = req.query;
    let q = `SELECT co.*, c.course_code, c.course_name, c.credit, c.course_type, c.offered_level, c.offered_term, t.name AS teacher_name, t.teacher_code,
      s.academic_year AS session, s.level AS semester_level, s.term AS semester_term, s.is_active,
      (CASE WHEN s.semester_id = (
         SELECT semester_id FROM semester s2 
         WHERE s2.academic_year = s.academic_year AND s2.dept_id = s.dept_id
         ORDER BY s2.level DESC, s2.term DESC LIMIT 1
      ) THEN 1 ELSE 0 END) AS is_running,
      (SELECT COUNT(*) FROM enrollment e WHERE e.offering_id=co.offering_id AND e.status IN ('Registered', 'Completed')) AS enrolled_count
      FROM course_offering co JOIN course c ON co.course_id=c.course_id LEFT JOIN teacher t ON co.teacher_id=t.teacher_id
      JOIN semester s ON co.semester_id=s.semester_id WHERE s.dept_id=?`;
    const p = [req.user.deptId];
    if (semester_id) { q += ' AND co.semester_id=?'; p.push(semester_id); }
    q += ' ORDER BY s.academic_year DESC, s.level ASC, s.term ASC, c.course_code ASC';
    const [rows] = await pool.query(q, p);
    await attachSchedules(rows);
    console.log('GET OFFERINGS SCHEDULE TEST:', rows.find(r => r.course_code === 'BUS263')?.schedules);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function createOffering(req, res, next) {
  try {
    const { course_id, semester_id, teacher_id, schedules } = req.body;
    const [r] = await pool.query('INSERT INTO course_offering (course_id,semester_id,teacher_id) VALUES(?,?,?)',
      [course_id, semester_id, teacher_id || null]);
    const offeringId = r.insertId;

    // Insert schedules if provided
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      const values = schedules.map(s => [offeringId, s.day_of_week, s.start_time, s.end_time, s.room_no || 'TBA']);
      await pool.query(
        'INSERT INTO course_schedule (offering_id, day_of_week, start_time, end_time, room_no) VALUES ?',
        [values]
      );
    }

    return created(res, { offering_id: offeringId });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Offering already exists'); next(err); }
}

async function updateOffering(req, res, next) {
  try {
    const { teacher_id, schedules } = req.body;
    const offeringId = req.params.id;

    // Update teacher if provided
    if (teacher_id !== undefined) {
      const [r] = await pool.query('UPDATE course_offering SET teacher_id=? WHERE offering_id=?', [teacher_id, offeringId]);
      if (r.affectedRows === 0) return notFound(res);
    }

    // Replace schedules if provided
    if (schedules && Array.isArray(schedules)) {
      await pool.query('DELETE FROM course_schedule WHERE offering_id=?', [offeringId]);
      if (schedules.length > 0) {
        const values = schedules.map(s => [offeringId, s.day_of_week, s.start_time, s.end_time, s.room_no || 'TBA']);
        await pool.query(
          'INSERT INTO course_schedule (offering_id, day_of_week, start_time, end_time, room_no) VALUES ?',
          [values]
        );
      }
    }

    return success(res, null, 'Offering updated');
  } catch (err) { next(err); }
}

async function deleteOffering(req, res, next) {
  try {
    const [e] = await pool.query('SELECT COUNT(*) as c FROM enrollment WHERE offering_id=?', [req.params.id]);
    if (e[0].c > 0) return badRequest(res, 'Cannot delete: has enrollments');
    const [r] = await pool.query('DELETE FROM course_offering WHERE offering_id=?', [req.params.id]);
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Offering deleted');
  } catch (err) { next(err); }
}

// --- GRADING WORKFLOW (New) ---

async function getSessions(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT DISTINCT session FROM student WHERE dept_id=? ORDER BY session DESC', [req.user.deptId]);
    return success(res, rows.map(r => r.session));
  } catch (err) { next(err); }
}

async function getGradingStudents(req, res, next) {
  try {
    const { session } = req.query;
    if (!session) return badRequest(res, 'Session is required');
    const [rows] = await pool.query('SELECT student_id, name, level, term FROM student WHERE dept_id=? AND session=? ORDER BY student_id', [req.user.deptId, session]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getStudentEnrollmentsByLevelTerm(req, res, next) {
  try {
    const { studentId } = req.params;
    const { level, term } = req.query;
    if (!level || !term) return badRequest(res, 'Level and term are required');

    // 1. Get student's department
    const [student] = await pool.query('SELECT dept_id, session FROM student WHERE student_id = ?', [studentId]);
    if (!student.length) return notFound(res, 'Student not found');
    const deptId = student[0].dept_id;

    // 2. Get all courses defined for this level/term (The Syllabus)
    // We include all courses for this L/T because many (Math, Physics, etc.) are owned by other depts
    const [syllabus] = await pool.query(`
      SELECT course_id, course_code, course_name, credit, course_type
      FROM course 
      WHERE offered_level = ? AND offered_term = ?
      ORDER BY course_code`, [level, term]);

    // 3. Get existing enrollments for this student for this level/term
    const [enrollments] = await pool.query(`
      SELECT 
        e.enrollment_id, e.student_id, e.grade_point, e.grade_letter, e.status,
        c.course_id, c.course_code, c.course_name, c.credit, co.offering_id
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE e.student_id = ? AND e.level = ? AND e.term = ?
      ORDER BY c.course_code`, [studentId, level, term]);

    // 4. Merge: For each syllabus course, find its enrollment if it exists
    const merged = syllabus.map(course => {
      const enrollment = enrollments.find(e => e.course_id === course.course_id);
      return {
        ...course,
        enrollment_id: enrollment ? enrollment.enrollment_id : null,
        grade_point: enrollment ? enrollment.grade_point : null,
        grade_letter: enrollment ? enrollment.grade_letter : null,
        status: enrollment ? enrollment.status : 'Not Registered',
        offering_id: enrollment ? enrollment.offering_id : null
      };
    });
      
    return success(res, merged);
  } catch (err) { next(err); }
}

async function saveGradeManual(req, res, next) {
  try {
    const { student_id, course_id, level, term, grade_point } = req.body;
    if (!student_id || !course_id || !level || !term || grade_point === undefined) {
      return badRequest(res, 'Missing required fields');
    }

    const gradeLetter = gradePointToLetter(grade_point);

    // Progression Check: Cannot add grade to current or future term
    const [student] = await pool.query('SELECT dept_id, session, level, term FROM student WHERE student_id = ?', [student_id]);
    if (!student.length) return notFound(res, 'Student not found');
    const { level: currentLevel, term: currentTerm, dept_id: deptId, session } = student[0];

    const sL = parseInt(level);
    const sT = parseInt(term);
    if (sL > currentLevel || (sL === currentLevel && sT >= currentTerm)) {
      return badRequest(res, `Cannot add grades to active/future term (Student is currently in L${currentLevel} T${currentTerm})`);
    }

    // 1. Check if enrollment already exists
    const [existing] = await pool.query(`
      SELECT e.enrollment_id 
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.course_id = ? AND e.level = ? AND e.term = ?
    `, [student_id, course_id, level, term]);

    if (existing.length > 0) {
      // Just update existing
      await pool.query(`UPDATE enrollment SET grade_point=?, grade_letter=?, status='Completed' WHERE enrollment_id=?`, [grade_point, gradeLetter, existing[0].enrollment_id]);
      await recalculateCGPA(student_id);
      return success(res, { grade_point, grade_letter: gradeLetter }, 'Grade updated');
    }

    // 2. Need to create enrollment. First, find a suitable offering.
    // Try to find an offering for this course in a semester that matches the L/T
    // (We already have deptId and session from the check above)

    // Look for a semester matching the session and L/T
    let [semesters] = await pool.query('SELECT semester_id FROM semester WHERE dept_id=? AND level=? AND term=? AND academic_year=?', [deptId, level, term, session]);
    
    let semesterId;
    if (semesters.length > 0) {
      semesterId = semesters[0].semester_id;
    } else {
      // Create a "Historical/Manual" semester if none exists
      const [newSem] = await pool.query(
        `INSERT INTO semester (academic_year, level, term, reg_start, reg_end, dept_id, is_active, is_locked) 
         VALUES (?, ?, ?, CURDATE(), CURDATE(), ?, 0, 1)`,
        [session, level, term, deptId]
      );
      semesterId = newSem.insertId;
    }

    // Find or create offering
    let [offerings] = await pool.query('SELECT offering_id FROM course_offering WHERE course_id=? AND semester_id=?', [course_id, semesterId]);
    
    let offeringId;
    if (offerings.length > 0) {
      offeringId = offerings[0].offering_id;
    } else {
      const [newOff] = await pool.query('INSERT INTO course_offering (course_id, semester_id) VALUES (?, ?)', [course_id, semesterId]);
      offeringId = newOff.insertId;
    }

    // 3. Create enrollment
    await pool.query(
      `INSERT INTO enrollment (student_id, offering_id, level, term, grade_point, grade_letter, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Completed')`,
      [student_id, offeringId, level, term, grade_point, gradeLetter]
    );

    await recalculateCGPA(student_id);

    // Notify the student their grade has been published
    sendNotification({
      userId: student_id,
      userType: 'student',
      title: 'Grade Published',
      message: `Your grade for L${level}T${term} has been saved: ${gradeLetter} (${grade_point}).`,
      type: 'info',
      link: '/student/transcript',
    }).catch(err => console.error('[Notif] saveGradeManual:', err.message));

    return success(res, { grade_point, grade_letter: gradeLetter }, 'Grade saved and enrollment created');
  } catch (err) { next(err); }
}

async function updateGrade(req, res, next) {
  try {
    const { enrollmentId } = req.params;
    const { grade_point } = req.body;
    if (grade_point === undefined) return badRequest(res, 'Grade point is required');

    const gradeLetter = gradePointToLetter(grade_point);

    // Progression Check: Find student current L/T and the enrollment's L/T
    const [info] = await pool.query(`
      SELECT e.level as targetLevel, e.term as targetTerm, s.level as currentLevel, s.term as currentTerm, s.student_id
      FROM enrollment e
      JOIN student s ON e.student_id = s.student_id
      WHERE e.enrollment_id = ?
    `, [enrollmentId]);

    if (!info.length) return notFound(res, 'Enrollment not found');
    const { targetLevel, targetTerm, currentLevel, currentTerm, student_id } = info[0];

    if (targetLevel > currentLevel || (targetLevel === currentLevel && targetTerm >= currentTerm)) {
      return badRequest(res, `Cannot update grades for active/future term (Student is currently in L${currentLevel} T${currentTerm})`);
    }

    await pool.query('UPDATE enrollment SET grade_point = ?, grade_letter = ?, status = "Completed" WHERE enrollment_id = ?', [grade_point, gradeLetter, enrollmentId]);
    
    await recalculateCGPA(student_id);

    // Notify the student their grade was updated
    sendNotification({
      userId: student_id,
      userType: 'student',
      title: 'Grade Updated',
      message: `Your grade has been updated to ${gradeLetter} (${grade_point}) by the Section Officer.`,
      type: 'info',
      link: '/student/transcript',
    }).catch(err => console.error('[Notif] updateGrade:', err.message));

    return success(res, { grade_point, grade_letter: gradeLetter }, 'Grade updated and CGPA recalculated');
  } catch (err) { next(err); }
}

async function bulkUpdateGrades(req, res, next) {
  try {
    const { grades } = req.body;
    const studentIds = new Set();
    for (const g of grades) {
      const gl = gradePointToLetter(g.grade_point);
      await pool.query(`UPDATE enrollment SET grade_point=?, grade_letter=?, status='Completed' WHERE enrollment_id=?`, [g.grade_point, gl, g.enrollment_id]);
      const [e] = await pool.query('SELECT student_id FROM enrollment WHERE enrollment_id=?', [g.enrollment_id]);
      if (e.length) studentIds.add(e[0].student_id);
    }
    await recalculateBulkCGPA([...studentIds]);

    // Notify each affected student
    sendBulkNotifications([...studentIds], 'student', {
      title: 'Grades Published',
      message: 'Your semester grades have been published by the Section Officer. View your transcript for details.',
      type: 'success',
      link: '/student/transcript',
    }).catch(err => console.error('[Notif] bulkUpdateGrades:', err.message));

    return success(res, { updated: grades.length }, 'Grades updated');
  } catch (err) { next(err); }
}

// --- ENROLLMENTS (view) ---
async function getEnrollments(req, res, next) {
  try {
    const { semester_id, status, course_id, page = 1, limit = 25 } = req.query;
    let q = `SELECT e.*, s.name AS student_name, c.course_code, c.course_name, sem.academic_year
      FROM enrollment e JOIN student s ON e.student_id=s.student_id
      JOIN course_offering co ON e.offering_id=co.offering_id JOIN course c ON co.course_id=c.course_id
      JOIN semester sem ON co.semester_id=sem.semester_id WHERE sem.dept_id=?`;
    const p = [req.user.deptId];
    if (semester_id) { q += ' AND sem.semester_id=?'; p.push(semester_id); }
    if (status) { q += ' AND e.status=?'; p.push(status); }
    if (course_id) { q += ' AND c.course_id=?'; p.push(course_id); }
    q += ' ORDER BY e.registered_at DESC LIMIT ? OFFSET ?';
    p.push(parseInt(limit), (page - 1) * limit);
    const [rows] = await pool.query(q, p);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getResultReport(req, res, next) {
  try {
    const { semester_id } = req.query;
    if (!semester_id) return badRequest(res, 'Semester ID required');

    const [rows] = await pool.query(`
      SELECT 
        s.student_id, 
        s.name,
        SUM(c.credit) as credit_offered,
        SUM(CASE WHEN e.grade_letter != 'F' THEN c.credit ELSE 0 END) as credit_secured,
        SUM(e.grade_point * c.credit) as point_secured,
        ROUND(SUM(e.grade_point * c.credit) / NULLIF(SUM(c.credit), 0), 3) as gpa,
        GROUP_CONCAT(CASE WHEN e.grade_letter = 'F' THEN c.course_code ELSE NULL END SEPARATOR ', ') as incomplete_courses
      FROM enrollment e
      JOIN student s ON e.student_id = s.student_id
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE co.semester_id = ? AND s.dept_id = ?
      GROUP BY s.student_id, s.name, s.batch
      ORDER BY s.batch DESC, s.student_id ASC
    `, [semester_id, req.user.deptId]);

    return success(res, rows);
  } catch (err) { next(err); }
}

async function getCourseMarksForReview(req, res, next) {
  try {
    const { offeringId } = req.params;
    const [offering] = await pool.query(`
      SELECT co.offering_id, co.marks_submitted_at, co.marks_submitted_by, c.course_type, sem.dept_id 
      FROM course_offering co JOIN course c ON co.course_id=c.course_id JOIN semester sem ON co.semester_id=sem.semester_id
      WHERE co.offering_id=? AND sem.dept_id=?
    `, [offeringId, req.user.deptId]);
    
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
      config: config[0],
      grading_scale: gradingScale,
      students
    });
  } catch (err) { next(err); }
}

async function publishCourseMarks(req, res, next) {
  try {
    const { offeringId } = req.params;
    const [offering] = await pool.query('SELECT sem.dept_id FROM course_offering co JOIN semester sem ON co.semester_id=sem.semester_id WHERE co.offering_id=? AND sem.dept_id=?', [offeringId, req.user.deptId]);
    if (!offering.length) return notFound(res, 'Course offering not found');

    await pool.query(`
      UPDATE enrollment 
      SET is_published=1, published_at=NOW(), published_by=?
      WHERE offering_id=? AND status='Completed'
    `, [req.user.name, offeringId]);

    return success(res, null, 'Grades verified and published successfully');
  } catch (err) { next(err); }
}

async function overrideStudentGrade(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { offeringId } = req.params;
    const { enrollment_id, attendance, assignment, mid, final, reason } = req.body;

    if (!reason) throw new Error('Override reason is required');

    const [offering] = await connection.query('SELECT sem.dept_id FROM course_offering co JOIN semester sem ON co.semester_id=sem.semester_id WHERE co.offering_id=? AND sem.dept_id=?', [offeringId, req.user.deptId]);
    if (!offering.length) throw new Error('Course offering not found');

    const [oldEnr] = await connection.query('SELECT grade_point, grade_letter FROM enrollment WHERE enrollment_id=?', [enrollment_id]);

    const [gradingScale] = await connection.query('SELECT * FROM grading_scale ORDER BY min_marks DESC');
    function calculateGrade(total) {
      const scale = gradingScale.find(s => total >= parseFloat(s.min_marks) && total <= parseFloat(s.max_marks));
      return scale ? { grade_letter: scale.grade_letter, grade_point: scale.grade_point } : { grade_letter: 'F', grade_point: 0.00 };
    }

    await connection.beginTransaction();

    await connection.query(`
      UPDATE marks_breakdown 
      SET attendance_marks=?, assignment_marks=?, mid_marks=?, final_marks=?
      WHERE enrollment_id=?
    `, [attendance, assignment, mid, final, enrollment_id]);

    const [breakdown] = await connection.query('SELECT total_marks FROM marks_breakdown WHERE enrollment_id=?', [enrollment_id]);
    const total = parseFloat(breakdown[0].total_marks || 0);
    const grade = calculateGrade(total);

    await connection.query(`
      UPDATE enrollment SET grade_point=?, grade_letter=?
      WHERE enrollment_id=?
    `, [grade.grade_point, grade.grade_letter, enrollment_id]);

    await connection.query(`
      INSERT INTO grade_audit (enrollment_id, changed_by, old_grade_point, new_grade_point, old_grade_letter, new_grade_letter, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [enrollment_id, req.user.name, oldEnr[0].grade_point, grade.grade_point, oldEnr[0].grade_letter, grade.grade_letter, reason]);

    await connection.commit();
    return success(res, null, 'Grade overridden successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

// ==========================================
// Marks Entry System - Staff
// ==========================================

async function getSemesterMarksStatus(req, res, next) {
  try {
    const { semesterId } = req.params;
    
    // Check readiness
    const { checkResultReady } = require('../services/marks.service');
    const progress = await checkResultReady(semesterId);

    // Get offerings
    const [offerings] = await pool.query(`
      SELECT co.offering_id, c.course_code, c.course_name, c.credit, t.name as teacher_name, co.marks_status
      FROM course_offering co
      JOIN course c ON co.course_id = c.course_id
      LEFT JOIN teacher t ON co.teacher_id = t.teacher_id
      WHERE co.semester_id = ?
      ORDER BY c.offered_level ASC, c.offered_term ASC, c.course_code ASC
    `, [semesterId]);

    return success(res, { progress, offerings });
  } catch (err) { next(err); }
}

async function getCourseMarksForReview(req, res, next) {
  try {
    const { semesterId, offeringId } = req.params;
    
    const [offering] = await pool.query('SELECT c.course_type, co.marks_status FROM course_offering co JOIN course c ON co.course_id = c.course_id WHERE co.offering_id = ?', [offeringId]);
    if (!offering.length) return notFound(res, 'Course offering not found');

    const [students] = await pool.query(`
      SELECT 
        e.enrollment_id, s.student_id as student_code, s.name, e.grade_letter, e.grade_point,
        mb.breakdown_id, mb.attendance_marks, mb.assignment_marks, mb.mid_marks, mb.final_marks, mb.total_marks,
        mb.entered_by_role, t.name as teacher_entered_name
      FROM enrollment e
      JOIN student s ON e.student_id = s.student_id
      LEFT JOIN marks_breakdown mb ON e.enrollment_id = mb.enrollment_id
      LEFT JOIN teacher t ON (mb.entered_by_id = t.teacher_id AND mb.entered_by_role = 'teacher')
      WHERE e.offering_id = ? AND e.status IN ('Registered', 'Completed')
      ORDER BY s.batch DESC, s.student_id ASC
    `, [offeringId]);

    const [config] = await pool.query('SELECT * FROM marks_config WHERE course_type=?', [offering[0].course_type]);
    const [gradingScale] = await pool.query('SELECT * FROM grading_scale ORDER BY min_marks DESC');

    return success(res, {
      course_type: offering[0].course_type,
      marks_status: offering[0].marks_status,
      config: config[0],
      grading_scale: gradingScale,
      students
    });
  } catch (err) { next(err); }
}

async function saveStaffCourseMarks(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { offeringId } = req.params;
    const marksData = req.body; 
    const { calculateGrade } = require('../services/marks.service');
    const { recalculateBulkCGPA } = require('../services/cgpa.service');

    await connection.beginTransaction();

    const studentIdsToRecalculate = [];

    const [staffRes] = await connection.query('SELECT staff_id FROM dept_staff WHERE staff_code=?', [req.user.userId]);
    const staffId = staffRes.length > 0 ? staffRes[0].staff_id : null;

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
        VALUES (?, ?, ?, ?, ?, ?, 'dept_staff', ?)
        ON DUPLICATE KEY UPDATE 
          attendance_marks=VALUES(attendance_marks),
          assignment_marks=VALUES(assignment_marks),
          mid_marks=VALUES(mid_marks),
          final_marks=VALUES(final_marks),
          total_marks=VALUES(total_marks),
          updated_by_role='dept_staff',
          updated_by_id=VALUES(entered_by_id)
      `, [m.enrollment_id, att, asg, mid, fin, total, staffId]);

      await connection.query(`
        UPDATE enrollment SET grade_point=?, grade_letter=?, status='Completed'
        WHERE enrollment_id=? AND is_published=0
      `, [grade.grade_point, grade.grade_letter, m.enrollment_id]);

      // get student id for cgpa calc
      const [stu] = await connection.query('SELECT student_id FROM enrollment WHERE enrollment_id=?', [m.enrollment_id]);
      if(stu.length) studentIdsToRecalculate.push(stu[0].student_id);
    }

    await connection.query('UPDATE course_offering SET marks_status=? WHERE offering_id=?', ['Completed', offeringId]);

    await connection.commit();

    return success(res, null, 'Marks saved and completed successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function publishSemesterResult(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { semesterId } = req.params;
    const { checkResultReady } = require('../services/marks.service');
    
    const progress = await checkResultReady(semesterId);
    if (!progress.isReady) {
      throw new Error('Not all courses are completed yet. Cannot publish result.');
    }

    await connection.beginTransaction();

    await connection.query('UPDATE semester SET result_status=?, result_published_at=NOW() WHERE semester_id=?', ['Published', semesterId]);
    await connection.query('UPDATE enrollment e JOIN course_offering co ON e.offering_id = co.offering_id SET e.is_published=1, e.published_at=NOW() WHERE co.semester_id=?', [semesterId]);

    // Get affected students to recalculate CGPA
    const [students] = await connection.query('SELECT DISTINCT e.student_id FROM enrollment e JOIN course_offering co ON e.offering_id=co.offering_id WHERE co.semester_id=?', [semesterId]);

    await connection.commit();
    
    // Recalculate CGPA
    const { recalculateBulkCGPA } = require('../services/cgpa.service');
    const studentIds = students.map(s => s.student_id);
    if (studentIds.length > 0) {
      await recalculateBulkCGPA(studentIds);
    }
    
    // Notify all students
    const { sendBulkNotifications } = require('../services/notification.service');
    await sendBulkNotifications(studentIds, 'student', {
      title: 'Result Published',
      message: 'Your results for the semester have been published. Check your transcript.',
      type: 'info',
      link: '/student/transcript'
    });

    return success(res, null, 'Result published successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

module.exports = {
  getTeachers, createTeacher, updateTeacher, deleteTeacher, resetTeacherPassword,
  getStudents, getStudentDetail, createStudent, updateStudent, advanceStudent, bulkUploadStudents,
  changeStudentStatus, resetStudentPassword, exportStudentsExcel,
  getCourses, createCourse, updateCourse, deleteCourse,
  getSemesters, createSemester, updateSemester, deleteSemester, toggleSemester,
  getOfferings, createOffering, updateOffering, deleteOffering,
  getSessions, getGradingStudents, getStudentEnrollmentsByLevelTerm,
  saveGradeManual, updateGrade, bulkUpdateGrades,
  getEnrollments,
  deleteStudent,
  bulkAdvanceStudents,
  getResultReport,
  getSemesterMarksStatus,
  getCourseMarksForReview,
  saveStaffCourseMarks,
  publishSemesterResult,
  getDepartments
};
