const pool = require('../config/db');

/**
 * Recalculate CGPA for a student.
 * This is a manual fallback in case the MySQL trigger fails.
 *
 * @param {string} studentId - The student ID
 */
async function recalculateCGPA(studentId) {
  const query = `
    UPDATE student s
    SET
      cgpa = COALESCE((
        SELECT ROUND(SUM(e.grade_point * c.credit) / NULLIF(SUM(c.credit), 0), 2)
        FROM enrollment e
        JOIN course_offering co ON e.offering_id = co.offering_id
        JOIN course c ON co.course_id = c.course_id
        WHERE e.student_id = s.student_id AND e.status = 'Completed' AND e.grade_point IS NOT NULL AND e.is_published = 1
      ), 0.000),
      total_credit_completed = (
        SELECT COALESCE(SUM(c.credit), 0)
        FROM enrollment e
        JOIN course_offering co ON e.offering_id = co.offering_id
        JOIN course c ON co.course_id = c.course_id
        WHERE e.student_id = s.student_id AND e.status = 'Completed' AND e.grade_point IS NOT NULL AND e.is_published = 1
      )
    WHERE s.student_id = ?;
  `;

  const [result] = await pool.query(query, [studentId]);
  return result;
}

/**
 * Recalculate CGPA for multiple students (after bulk grade entry).
 *
 * @param {string[]} studentIds
 */
async function recalculateBulkCGPA(studentIds) {
  const results = [];
  for (const id of studentIds) {
    const result = await recalculateCGPA(id);
    results.push({ studentId: id, affectedRows: result.affectedRows });
  }
  return results;
}

module.exports = { recalculateCGPA, recalculateBulkCGPA };
