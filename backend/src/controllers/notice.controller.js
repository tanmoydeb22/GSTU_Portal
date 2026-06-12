const db = require('../config/db');

// Helper to get dept_id of user
async function getUserDeptId(role, userId) {
  if (role === 'admin') return null;
  let query = '';
  if (role === 'student') query = 'SELECT dept_id FROM student WHERE student_id = ?';
  else if (role === 'teacher') query = 'SELECT dept_id FROM teacher WHERE teacher_id = ?';
  else if (role === 'dept_staff') query = 'SELECT dept_id FROM dept_staff WHERE staff_id = ?';
  
  if (!query) return null;

  try {
    const [rows] = await db.execute(query, [userId]);
    return rows.length > 0 ? rows[0].dept_id : null;
  } catch (err) {
    console.error('Error getting dept_id:', err);
    return null;
  }
}

// 1. PUBLIC: Get all active, visible notices for the current user
exports.getNotices = async (req, res) => {
  try {
    const userRole = req.user.role; // 'student', 'teacher', 'dept_staff', 'admin'
    const userId = req.user.id;
    const { category, page = 1, limit = 10 } = req.query;
    
    let deptId = await getUserDeptId(userRole, userId);
    
    let sql = `
      SELECT n.*, a.name as published_by_name
      FROM notice n
      LEFT JOIN admin a ON n.published_by = a.admin_id
      WHERE n.is_active = 1
      AND (n.expires_at IS NULL OR n.expires_at >= NOW())
    `;
    const params = [];

    // Filter by role
    if (userRole !== 'admin') {
      sql += ` AND (n.target_role = 'all' OR n.target_role = ?)`;
      params.push(userRole);
    }

    // Filter by department (if the user belongs to a dept)
    if (deptId && userRole !== 'admin') {
      sql += ` AND (n.target_dept IS NULL OR n.target_dept = ?)`;
      params.push(deptId);
    } else if (userRole !== 'admin') {
      // If user has no dept (edge case), only show cross-dept notices
      sql += ` AND n.target_dept IS NULL`;
    }

    // Category filter
    if (category && category !== 'All') {
      sql += ` AND n.category = ?`;
      params.push(category);
    }

    // Count total for pagination
    const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM (${sql}) as subquery`, params);
    const total = countResult[0].total;

    // Sorting and Pagination
    sql += ` ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`;

    const [rows] = await db.query(sql, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 2. ADMIN/STAFF: Get notices for management table
exports.getAllManageNotices = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let sql = `
      SELECT n.*, d.dept_name 
      FROM notice n
      LEFT JOIN department d ON n.target_dept = d.dept_id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'dept_staff') {
      const deptId = await getUserDeptId(userRole, userId);
      sql += ` AND n.target_dept = ?`;
      params.push(deptId);
    }

    sql += ` ORDER BY n.published_at DESC`;
    
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 3. ADMIN/STAFF: Create Notice
exports.createNotice = async (req, res) => {
  try {
    const { title, content, category, target_role, target_dept, is_pinned, is_active, expires_at } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id; // Usually admin_id or staff_id

    // Check if staff is trying to post for another dept
    let finalDept = target_dept === 'null' || !target_dept ? null : parseInt(target_dept);
    
    if (userRole === 'dept_staff') {
      const staffDeptId = await getUserDeptId(userRole, userId);
      finalDept = staffDeptId; // Force dept_staff to only post to their dept
    }

    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = `/uploads/notices/${req.file.filename}`;
    }

    const sql = `
      INSERT INTO notice (title, content, category, target_role, target_dept, is_pinned, is_active, attachment_url, published_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert 'null' strings or empty to actual nulls
    const expAt = expires_at === 'null' || !expires_at ? null : expires_at;
    const isPinned = is_pinned === 'true' || is_pinned === true ? 1 : 0;
    const isActive = is_active === 'true' || is_active === true ? 1 : 0;
    
    // Note: published_by requires an INT. We assume admin_id or staff_id is an INT or can be used here.
    // If staff_id is VARCHAR, we might need a dummy admin ID or change schema.
    // Let's assume published_by can be 0 or something if not admin.
    let publisherId = 1; // Default admin ID fallback
    if (userRole === 'admin') publisherId = parseInt(userId) || 1;

    await db.execute(sql, [
      title, content, category || 'General', target_role || 'all', finalDept,
      isPinned, isActive, attachmentUrl, publisherId, expAt
    ]);

    res.json({ success: true, message: 'Notice created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 4. ADMIN/STAFF: Update Notice
exports.updateNotice = async (req, res) => {
  try {
    const noticeId = req.params.id;
    const { title, content, category, target_role, target_dept, is_pinned, is_active, expires_at } = req.body;
    const userRole = req.user.role;
    
    // Ownership check for dept_staff
    if (userRole === 'dept_staff') {
      const staffDeptId = await getUserDeptId(userRole, req.user.id);
      const [n] = await db.execute('SELECT target_dept FROM notice WHERE notice_id = ?', [noticeId]);
      if (!n.length || n[0].target_dept !== staffDeptId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    let sql = `
      UPDATE notice 
      SET title=?, content=?, category=?, target_role=?, target_dept=?, is_pinned=?, is_active=?, expires_at=?
    `;
    
    const expAt = expires_at === 'null' || !expires_at ? null : expires_at;
    const isPinned = is_pinned === 'true' || is_pinned === true ? 1 : 0;
    const isActive = is_active === 'true' || is_active === true ? 1 : 0;
    let finalDept = target_dept === 'null' || !target_dept ? null : parseInt(target_dept);
    
    if (userRole === 'dept_staff') {
      finalDept = await getUserDeptId(userRole, req.user.id);
    }

    const params = [title, content, category, target_role, finalDept, isPinned, isActive, expAt];

    if (req.file) {
      sql += `, attachment_url=?`;
      params.push(`/uploads/notices/${req.file.filename}`);
    }

    sql += ` WHERE notice_id=?`;
    params.push(noticeId);

    await db.execute(sql, params);
    res.json({ success: true, message: 'Notice updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 5. Delete Notice
exports.deleteNotice = async (req, res) => {
  try {
    const noticeId = req.params.id;
    const userRole = req.user.role;
    
    if (userRole === 'dept_staff') {
      const staffDeptId = await getUserDeptId(userRole, req.user.id);
      const [n] = await db.execute('SELECT target_dept FROM notice WHERE notice_id = ?', [noticeId]);
      if (!n.length || n[0].target_dept !== staffDeptId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    await db.execute('DELETE FROM notice WHERE notice_id = ?', [noticeId]);
    res.json({ success: true, message: 'Notice deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 6. Toggle Pin
exports.togglePin = async (req, res) => {
  try {
    const noticeId = req.params.id;
    const userRole = req.user.role;
    
    if (userRole === 'dept_staff') {
      const staffDeptId = await getUserDeptId(userRole, req.user.id);
      const [n] = await db.execute('SELECT target_dept FROM notice WHERE notice_id = ?', [noticeId]);
      if (!n.length || n[0].target_dept !== staffDeptId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    await db.execute('UPDATE notice SET is_pinned = NOT is_pinned WHERE notice_id = ?', [noticeId]);
    res.json({ success: true, message: 'Pin status toggled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
