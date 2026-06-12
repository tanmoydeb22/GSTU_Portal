const pool = require('../config/db');

/**
 * Generates a student ID in the format: {batch}{dept_code}{3-digit-sequence}
 * Example: 2024CSE046
 *
 * @param {number} batch - Admission year (e.g. 2024)
 * @param {string} deptCode - Department code (e.g. 'CSE')
 * @returns {Promise<string>} Generated student ID
 */
async function generateStudentId(batch, deptCode) {
  const prefix = `${batch}${deptCode}`;

  const [rows] = await pool.query(
    `SELECT student_id FROM student
     WHERE student_id LIKE ?
     ORDER BY student_id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  const lastSeq = rows.length > 0
    ? parseInt(rows[0].student_id.slice(-3), 10)
    : 0;

  return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
}

module.exports = { generateStudentId };
