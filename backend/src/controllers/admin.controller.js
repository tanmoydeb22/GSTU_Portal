const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { success, created, error, badRequest, notFound } = require('../utils/response');
const { generateTempPassword } = require('../services/auth.service');
const { generateAdminTempPassword } = require('../utils/passwordGenerator');
const { validateStudentCSV, removeUploadedFile } = require('../services/csv.service');

/**
 * GET /api/admin/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM student WHERE is_active = 1) AS total_students,
        (SELECT COUNT(*) FROM teacher WHERE is_active = 1) AS total_teachers,
        (SELECT COUNT(*) FROM department) AS total_departments,
        (SELECT COUNT(DISTINCT dept_id) FROM semester WHERE is_active = 1) AS depts_with_active_semester,
        (SELECT COUNT(*) FROM semester WHERE result_published_at IS NOT NULL AND YEAR(result_published_at) = YEAR(CURRENT_DATE())) AS published_results_this_year,
        (SELECT COUNT(d.dept_id) FROM department d LEFT JOIN dept_staff ds ON d.dept_id = ds.dept_id AND ds.is_active = 1 WHERE ds.staff_id IS NULL) AS depts_without_access
    `);

    // Enrollments per department for chart
    const [deptEnrollments] = await pool.query(`
      SELECT d.dept_code, d.dept_name, COUNT(e.enrollment_id) AS enrollment_count
      FROM department d
      LEFT JOIN course c ON c.dept_id = d.dept_id
      LEFT JOIN course_offering co ON co.course_id = c.course_id
      LEFT JOIN enrollment e ON e.offering_id = co.offering_id AND e.status = 'Registered'
      GROUP BY d.dept_id, d.dept_code, d.dept_name
      ORDER BY enrollment_count DESC
    `);

    // CGPA Distribution
    const [cgpaRows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN cgpa >= 0 AND cgpa < 1 THEN 1 ELSE 0 END) AS 'range_0_1',
        SUM(CASE WHEN cgpa >= 1 AND cgpa < 2 THEN 1 ELSE 0 END) AS 'range_1_2',
        SUM(CASE WHEN cgpa >= 2 AND cgpa < 3 THEN 1 ELSE 0 END) AS 'range_2_3',
        SUM(CASE WHEN cgpa >= 3 AND cgpa < 3.5 THEN 1 ELSE 0 END) AS 'range_3_35',
        SUM(CASE WHEN cgpa >= 3.5 AND cgpa <= 4 THEN 1 ELSE 0 END) AS 'range_35_4'
      FROM student WHERE is_active = 1 AND cgpa > 0
    `);
    
    const cgpaData = cgpaRows[0] ? [
      { name: '0-1', value: Number(cgpaRows[0].range_0_1 || 0) },
      { name: '1-2', value: Number(cgpaRows[0].range_1_2 || 0) },
      { name: '2-3', value: Number(cgpaRows[0].range_2_3 || 0) },
      { name: '3-3.5', value: Number(cgpaRows[0].range_3_35 || 0) },
      { name: '3.5-4', value: Number(cgpaRows[0].range_35_4 || 0) }
    ] : [];

    // Recent activity
    const [activity] = await pool.query(`
      (SELECT 'enrollment' as type, CONCAT(s.name, ' enrolled in ', c.course_code) as message, e.registered_at as created_at FROM enrollment e JOIN student s ON e.student_id=s.student_id JOIN course_offering co ON e.offering_id=co.offering_id JOIN course c ON co.course_id=c.course_id ORDER BY e.registered_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'staff' as type, CONCAT('New dept staff ', name, ' created') as message, created_at FROM dept_staff ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'notice' as type, CONCAT('Notice: ', title) as message, published_at as created_at FROM notice ORDER BY published_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 10
    `);

    return success(res, {
      stats: rows[0],
      deptEnrollments,
      cgpaDistribution: cgpaData,
      recentActivity: activity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/admins (Super Admin only)
 */
async function createAdmin(req, res, next) {
  try {
    const { name, email } = req.body;
    
    if (req.user.adminRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Only Super Admin can create sub-admins' });
    }

    const tempPassword = generateAdminTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const [adminRows] = await pool.query('SELECT admin_id FROM admin WHERE email = ?', [req.user.userId]);
    const creatorId = adminRows[0] ? adminRows[0].admin_id : null;

    const [result] = await pool.query(
      `INSERT INTO admin (name, email, password, role, created_by, must_change_password) 
       VALUES (?, ?, ?, 'admin', ?, 1)`,
      [name, email, hash, creatorId]
    );

    return created(res, { email, temp_password: tempPassword }, 'Admin account created successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Email already exists');
    next(err);
  }
}

/**
 * GET /api/admin/departments
 */
async function getDepartments(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT d.*,
        (SELECT COUNT(*) FROM dept_staff ds WHERE ds.dept_id = d.dept_id AND ds.is_active = 1) AS staff_count,
        (SELECT COUNT(*) FROM teacher t WHERE t.dept_id = d.dept_id AND t.is_active = 1) AS teacher_count,
        (SELECT COUNT(*) FROM student s WHERE s.dept_id = d.dept_id AND s.is_active = 1) AS student_count,
        (SELECT AVG(cgpa) FROM student s WHERE s.dept_id = d.dept_id AND s.is_active = 1 AND s.cgpa > 0) AS avg_cgpa,
        (SELECT SUM(total_amount) FROM payment p JOIN student s ON p.student_id = s.student_id WHERE s.dept_id = d.dept_id AND p.status = 'Paid') AS revenue
      FROM department d ORDER BY d.dept_id
    `);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/departments/:id
 */
async function getDepartmentOverview(req, res, next) {
  try {
    const { id } = req.params;
    
    const [deptRows] = await pool.query(`
      SELECT d.*,
        (SELECT COUNT(*) FROM teacher t WHERE t.dept_id = d.dept_id AND t.is_active = 1) AS teacher_count,
        (SELECT COUNT(*) FROM student s WHERE s.dept_id = d.dept_id AND s.is_active = 1) AS student_count
      FROM department d WHERE d.dept_id = ?
    `, [id]);
    
    if (deptRows.length === 0) return notFound(res, 'Department not found');
    
    const [teachers] = await pool.query('SELECT teacher_id, teacher_code, name, designation, is_active FROM teacher WHERE dept_id = ? ORDER BY teacher_code ASC', [id]);
    
    const [studentsGrouped] = await pool.query(`
      SELECT session, COUNT(*) as count
      FROM student
      WHERE dept_id = ? AND is_active = 1
      GROUP BY session
      ORDER BY session DESC
    `, [id]);
    
    return success(res, {
      department: deptRows[0],
      teachers,
      students_by_session: studentsGrouped
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/departments/:id/students
 */
async function getDepartmentStudents(req, res, next) {
  try {
    const { id } = req.params;
    const { session } = req.query;
    const [rows] = await pool.query(`
      SELECT student_id, name, cgpa, is_active, session, batch
      FROM student
      WHERE dept_id = ? AND session = ?
      ORDER BY student_id ASC
    `, [id, session]);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/departments
 */
async function createDepartment(req, res, next) {
  try {
    const { dept_code, dept_name } = req.body;
    const [result] = await pool.query('INSERT INTO department (dept_code, dept_name) VALUES (?, ?)', [dept_code, dept_name]);
    return created(res, { dept_id: result.insertId, dept_code, dept_name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Department code already exists');
    next(err);
  }
}

/**
 * PUT /api/admin/departments/:id
 */
async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const { dept_code, dept_name } = req.body;
    const [result] = await pool.query('UPDATE department SET dept_code = ?, dept_name = ? WHERE dept_id = ?', [dept_code, dept_name, id]);
    if (result.affectedRows === 0) return notFound(res, 'Department not found');
    return success(res, null, 'Department updated');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Department code already exists');
    next(err);
  }
}

/**
 * GET /api/admin/dept-staff
 */
async function getDeptStaff(req, res, next) {
  try {
    const { dept_id, page = 1, limit = 25, search, status } = req.query;
    let query = `
      SELECT ds.staff_id, ds.staff_code, ds.name, ds.email, ds.phone, ds.designation, ds.last_login, ds.is_active, 
             d.dept_id, d.dept_code, d.dept_name
      FROM department d
      LEFT JOIN dept_staff ds ON d.dept_id = ds.dept_id
      WHERE 1=1
    `;
    const params = [];

    if (dept_id) { query += ' AND d.dept_id = ?'; params.push(dept_id); }
    if (status === 'active') { query += ' AND ds.is_active = 1'; }
    if (search) {
      query += ' AND (ds.name LIKE ? OR ds.staff_code LIKE ? OR ds.email LIKE ? OR d.dept_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    query += ' ORDER BY d.dept_id ASC, ds.staff_code ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return success(res, { staff: rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/dept-staff
 */
async function createDeptStaff(req, res, next) {
  try {
    const { staff_code, name, email, phone, dept_id } = req.body;
    const tempPassword = generateTempPassword('Staff');
    const hash = await bcrypt.hash(tempPassword, 10);

    const [result] = await pool.query(
      `INSERT INTO dept_staff (staff_code, name, email, phone, dept_id, password, must_change_password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [staff_code, name, email, phone, dept_id, hash]
    );

    return created(res, {
      staff_id: result.insertId, staff_code, name, email, tempPassword,
    }, 'Staff created. Temporary password generated.');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Staff code or email already exists');
    next(err);
  }
}

/**
 * PUT /api/admin/dept-staff/:id
 */
async function updateDeptStaff(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, phone, is_active } = req.body;
    const fields = [], params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }

    if (fields.length === 0) return badRequest(res, 'No fields to update');

    params.push(id);
    const [result] = await pool.query(`UPDATE dept_staff SET ${fields.join(', ')} WHERE staff_id = ?`, params);

    if (result.affectedRows === 0) return notFound(res, 'Staff not found');
    return success(res, null, 'Staff updated');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/dept-staff/:id
 */
async function deleteDeptStaff(req, res, next) {
  try {
    const { id } = req.params;
    const [result] = await pool.query('UPDATE dept_staff SET is_active = 0 WHERE staff_id = ?', [id]);
    if (result.affectedRows === 0) return notFound(res, 'Staff not found');
    return success(res, null, 'Staff deactivated');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users/search
 */
async function globalUserSearch(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return success(res, []);
    
    const search = `%${q}%`;
    
    const [rows] = await pool.query(`
      (SELECT 'admin' as role, admin_id as id, email as code, name, email, is_active FROM admin WHERE name LIKE ? OR email LIKE ?)
      UNION
      (SELECT 'dept_staff' as role, staff_id as id, staff_code as code, name, email, is_active FROM dept_staff WHERE name LIKE ? OR staff_code LIKE ? OR email LIKE ?)
      UNION
      (SELECT 'teacher' as role, teacher_id as id, teacher_code as code, name, email, is_active FROM teacher WHERE name LIKE ? OR teacher_code LIKE ? OR email LIKE ?)
      UNION
      (SELECT 'student' as role, student_id as id, student_id as code, name, email, is_active FROM student WHERE name LIKE ? OR student_id LIKE ? OR email LIKE ?)
      LIMIT 50
    `, [search, search, search, search, search, search, search, search, search, search, search]);
    
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/users/:role/:id
 */
async function updateGlobalUser(req, res, next) {
  try {
    const { role, id } = req.params;
    const { is_active, reset_password } = req.body;
    
    const roleTableMap = {
      'admin': { table: 'admin', pk: 'admin_id' },
      'dept_staff': { table: 'dept_staff', pk: 'staff_id' },
      'teacher': { table: 'teacher', pk: 'teacher_id' },
      'student': { table: 'student', pk: 'student_id' }
    };
    
    const config = roleTableMap[role];
    if (!config) return badRequest(res, 'Invalid role');
    
    const fields = [];
    const params = [];
    let tempPassword = null;
    
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(is_active);
    }
    
    if (reset_password) {
      tempPassword = generateTempPassword(role);
      const hash = await bcrypt.hash(tempPassword, 10);
      fields.push('password = ?');
      params.push(hash);
      
      if (role !== 'admin') {
        fields.push('must_change_password = 1');
      }
    }
    
    if (fields.length === 0) return badRequest(res, 'No action specified');
    
    params.push(id);
    const [result] = await pool.query(`UPDATE ${config.table} SET ${fields.join(', ')} WHERE ${config.pk} = ?`, params);
    
    if (result.affectedRows === 0) return notFound(res, 'User not found');
    
    return success(res, { tempPassword }, 'User updated');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/teachers (Read-only)
 */
async function getTeachers(req, res, next) {
  try {
    const { dept_id, page = 1, limit = 25, search } = req.query;
    let query = `
      SELECT t.teacher_id, t.teacher_code, t.name, t.email, t.phone, t.designation,
             t.is_active, d.dept_code, d.dept_name
      FROM teacher t
      JOIN department d ON t.dept_id = d.dept_id
      WHERE 1=1
    `;
    const params = [];
    if (dept_id) { query += ' AND t.dept_id = ?'; params.push(dept_id); }
    if (search) { query += ' AND (t.name LIKE ? OR t.teacher_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const countQuery = query.replace(/SELECT t\.teacher_id[\s\S]*?d\.dept_name/, 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    query += ' ORDER BY t.teacher_code LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return success(res, { teachers: rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

/**
 * GET /api/admin/students (Read-only)
 */
async function getStudents(req, res, next) {
  try {
    const { dept_id, batch, page = 1, limit = 25, search } = req.query;
    let query = `
      SELECT s.student_id, s.name, s.email, s.batch, s.session, s.level, s.term,
             s.cgpa, s.total_credit_completed, s.is_active, d.dept_code, d.dept_name
      FROM student s
      JOIN department d ON s.dept_id = d.dept_id
      WHERE 1=1
    `;
    const params = [];
    if (dept_id) { query += ' AND s.dept_id = ?'; params.push(dept_id); }
    if (batch) { query += ' AND s.batch = ?'; params.push(batch); }
    if (search) { query += ' AND (s.name LIKE ? OR s.student_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const countQuery = query.replace(/SELECT s\.student_id[\s\S]*?d\.dept_name/, 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countQuery, params);
    const total = countRows[0].total;

    const offset = (page - 1) * limit;
    query += ' ORDER BY s.batch DESC, s.student_id ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    return success(res, { students: rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

/**
 * GET /api/admin/reports/enrollment
 */
async function getEnrollmentReport(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM vw_enrollment_report');
    return success(res, rows);
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/bulk-upload/students
 */
async function bulkUploadStudents(req, res, next) {
  try {
    if (!req.file) return badRequest(res, 'CSV file required');
    const result = validateStudentCSV(req.file.path);
    if (result.errors.length > 0) {
      removeUploadedFile(req.file.path);
      return badRequest(res, 'CSV validation failed', result.errors);
    }
    let inserted = 0, errors = [];
    for (const row of result.data) {
      try {
        const hash = await bcrypt.hash(row.student_id, 10);
        await pool.query(
          `INSERT INTO student (student_id, name, email, phone, batch, session, level, term, dept_id, password, must_change_password, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
          [row.student_id, row.name, row.email, row.phone, row.batch, row.session, row.level, row.term, row.dept_id || req.body.dept_id, hash]
        );
        inserted++;
      } catch (err) {
        errors.push({ student_id: row.student_id, error: err.code === 'ER_DUP_ENTRY' ? 'Duplicate ID' : err.message });
      }
    }
    removeUploadedFile(req.file.path);
    return success(res, { inserted, failed: errors.length, errors }, 'Bulk upload completed');
  } catch (err) {
    if (req.file) removeUploadedFile(req.file.path);
    next(err);
  }
}

/**
 * GET /api/admin/settings/grading-scale
 */
async function getGradingScale(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM grading_scale ORDER BY min_marks DESC');
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings/grading-scale
 */
async function updateGradingScale(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const scales = req.body;
    await connection.beginTransaction();
    await connection.query('DELETE FROM grading_scale');
    for (const s of scales) {
      await connection.query(`
        INSERT INTO grading_scale (grade_letter, grade_point, min_marks, max_marks)
        VALUES (?, ?, ?, ?)
      `, [s.grade_letter, s.grade_point, s.min_marks, s.max_marks]);
    }
    await connection.commit();
    return success(res, null, 'Grading scale updated successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

/**
 * GET /api/admin/settings/marks-config
 */
async function getMarksConfig(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM marks_config ORDER BY config_id ASC');
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings/marks-config
 */
async function updateMarksConfig(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const configs = req.body;
    await connection.beginTransaction();
    await connection.query('DELETE FROM marks_config');
    for (const c of configs) {
      await connection.query(`
        INSERT INTO marks_config (course_type, attendance_max, assignment_max, mid_max, final_max)
        VALUES (?, ?, ?, ?, ?)
      `, [c.course_type, c.attendance_max, c.assignment_max, c.mid_max, c.final_max]);
    }
    await connection.commit();
    return success(res, null, 'Marks config updated successfully');
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

async function getDepartmentTeachers(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT teacher_id, teacher_code, name, email, phone, designation, is_active
      FROM teacher
      WHERE dept_id = ?
      ORDER BY teacher_code ASC
    `, [id]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getDepartmentStudents(req, res, next) {
  try {
    const { id } = req.params;
    const { session } = req.query;
    let query = 'SELECT student_id, name, cgpa, is_active FROM student WHERE dept_id = ?';
    const params = [id];
    if (session) {
      query += ' AND session = ?';
      params.push(session);
    }
    query += ' ORDER BY student_id ASC';
    const [rows] = await pool.query(query, params);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getDepartmentResults(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT semester_id, academic_year, level, term, is_active, result_published_at
      FROM semester
      WHERE dept_id = ?
      ORDER BY level ASC, term ASC
    `, [id]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getSemesterResultBoard(req, res, next) {
  try {
    const { semesterId } = req.params;
    const query = `
      SELECT s.student_id, s.name, ROUND(SUM(e.grade_point * c.credit) / SUM(c.credit), 2) as sgpa
      FROM student s
      JOIN enrollment e ON s.student_id = e.student_id
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE co.semester_id = ? AND e.grade_point IS NOT NULL
      GROUP BY s.student_id, s.name
      ORDER BY s.student_id ASC
    `;
    const [rows] = await pool.query(query, [semesterId]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function getDepartmentStaffAccess(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT staff_id, staff_code, name, email, phone, designation, is_active, last_login, login_count
      FROM dept_staff
      WHERE dept_id = ?
    `, [id]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function createDepartmentStaffAccess(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, phone, designation } = req.body;
    
    const [deptRows] = await pool.query('SELECT dept_code FROM department WHERE dept_id = ?', [id]);
    if (deptRows.length === 0) return badRequest(res, 'Department not found');
    const deptCode = deptRows[0].dept_code;
    const staff_code = `${deptCode}-SO`;
    
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${deptCode}@Temp${randomSuffix}`;
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      `INSERT INTO dept_staff (staff_code, name, email, phone, dept_id, designation, password, must_change_password, is_active)
       VALUES (?, ?, ?, ?, ?, 'Section Officer', ?, 1, 1)`,
      [staff_code, name, email, phone, id, hash]
    );

    return res.json({
      success: true,
      data: { staff_code, temp_password: tempPassword },
      message: 'Share these credentials with the Section Officer.'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('uq_one_staff_per_dept')) {
        return res.status(400).json({ error: 'This department already has a Section Officer account. Use Reset Password if they forgot their password.' });
      }
      return badRequest(res, 'Email already exists');
    }
    next(err);
  }
}

async function resetStaffPassword(req, res, next) {
  try {
    const { staffId } = req.params;
    
    const [staffRows] = await pool.query('SELECT ds.*, d.dept_code FROM dept_staff ds JOIN department d ON ds.dept_id = d.dept_id WHERE ds.staff_id = ?', [staffId]);
    if (staffRows.length === 0) return notFound(res, 'Staff not found');
    
    const deptCode = staffRows[0].dept_code;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${deptCode}@Reset${randomSuffix}`;
    const hash = await bcrypt.hash(tempPassword, 10);
    
    await pool.query('UPDATE dept_staff SET password = ?, must_change_password = 1 WHERE staff_id = ?', [hash, staffId]);
    
    return res.json({
      success: true,
      data: { temp_password: tempPassword },
      message: 'Share this new password with the Section Officer.'
    });
  } catch (err) { next(err); }
}

async function toggleStaffStatus(req, res, next) {
  try {
    const { staffId } = req.params;
    const { is_active } = req.body;
    
    const [result] = await pool.query('UPDATE dept_staff SET is_active = ? WHERE staff_id = ?', [is_active, staffId]);
    if (result.affectedRows === 0) return notFound(res, 'Staff not found');
    
    return success(res, null, 'Status updated');
  } catch (err) { next(err); }
}

async function deleteDeptStaff(req, res, next) {
  try {
    const { staffId } = req.params;
    const [result] = await pool.query('DELETE FROM dept_staff WHERE staff_id = ?', [staffId]);
    if (result.affectedRows === 0) return notFound(res, 'Staff not found');
    
    return success(res, null, 'Staff access revoked successfully');
  } catch (err) { next(err); }
}

module.exports = {
  getDashboard, getDepartments, getDepartmentOverview, getDepartmentStudents, getDepartmentTeachers, getDepartmentResults, getSemesterResultBoard,
  getDepartmentStaffAccess, createDepartmentStaffAccess, resetStaffPassword, toggleStaffStatus,
  createDepartment, updateDepartment, getDeptStaff, createDeptStaff, updateDeptStaff, deleteDeptStaff,
  globalUserSearch, updateGlobalUser,
  getTeachers, getStudents, getEnrollmentReport, bulkUploadStudents,
  getGradingScale, updateGradingScale, getMarksConfig, updateMarksConfig,
  createAdmin
};
