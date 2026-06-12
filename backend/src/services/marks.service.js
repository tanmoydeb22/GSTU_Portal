const pool = require('../config/db');

async function calculateGrade(totalMarks) {
  const [scales] = await pool.query('SELECT * FROM grading_scale ORDER BY min_marks DESC');
  const scale = scales.find(s => totalMarks >= parseFloat(s.min_marks) && totalMarks <= parseFloat(s.max_marks));
  return scale || { grade_letter: 'F', grade_point: 0.00 };
}

async function getMarksConfig(courseType) {
  const [config] = await pool.query('SELECT * FROM marks_config WHERE course_type = ?', [courseType]);
  return config[0] || null;
}

async function checkResultReady(semesterId) {
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN marks_status = 'Completed' THEN 1 ELSE 0 END) as done
    FROM course_offering
    WHERE semester_id = ?
  `, [semesterId]);
  
  const total = parseInt(rows[0].total) || 0;
  const done = parseInt(rows[0].done) || 0;
  return {
    total,
    done,
    isReady: total > 0 && total === done
  };
}

module.exports = {
  calculateGrade,
  getMarksConfig,
  checkResultReady
};
