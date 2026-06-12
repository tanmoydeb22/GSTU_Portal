const pool = require('../config/db');

/**
 * Calculates the payment details for a student in a specific semester.
 * @param {string} studentId
 * @param {number} semesterId
 * @returns {Promise<Object>} The payment breakdown and total
 */
async function calculatePayment(studentId, semesterId) {
  // 1. Get student & semester details
  const [studentRows] = await pool.query('SELECT dept_id, level, term FROM student WHERE student_id = ?', [studentId]);
  if (!studentRows.length) throw new Error('Student not found');
  const student = studentRows[0];

  const [semesterRows] = await pool.query('SELECT * FROM semester WHERE semester_id = ?', [semesterId]);
  if (!semesterRows.length) throw new Error('Semester not found');
  const semester = semesterRows[0];

  // 2. Get the applicable fee structure
  // It applies to the semester's dept, but using the student's level/term and the semester's academic year. 
  const [feeRows] = await pool.query(
    'SELECT * FROM fee_structure WHERE dept_id = ? AND academic_year = ? AND level = ? AND term = ?',
    [student.dept_id, semester.academic_year, student.level, student.term]
  );
  
  // If no specific fee structure is found, provide a default 0 structure to avoid crashing
  const feeStructure = feeRows.length > 0 ? feeRows[0] : {
    base_amount: 0, per_course_fixed: 0, per_credit_fee: 0
  };

  // 3. Get all registered courses for the student in this semester
  const [enrollments] = await pool.query(`
    SELECT e.enrollment_id, e.offering_id, e.enrollment_type, c.course_code, c.credit 
    FROM enrollment e
    JOIN course_offering co ON e.offering_id = co.offering_id
    JOIN course c ON co.course_id = c.course_id
    WHERE e.student_id = ? AND co.semester_id = ? AND e.status = 'Registered'
  `, [studentId, semesterId]);

  let baseAmount = parseFloat(feeStructure.base_amount);
  let extraFixed = 0;
  let extraCreditCost = 0;

  const paymentItems = [];

  for (const item of enrollments) {
    const credit = parseFloat(item.credit);
    paymentItems.push({
      offering_id: item.offering_id,
      course_code: item.course_code,
      credit: credit,
      item_type: item.enrollment_type
    });

    if (item.enrollment_type === 'Retake' || item.enrollment_type === 'Improvement') {
      extraFixed += parseFloat(feeStructure.per_course_fixed);
      extraCreditCost += (credit * parseFloat(feeStructure.per_credit_fee));
    }
  }

  const totalAmount = Math.round(baseAmount + extraFixed + extraCreditCost);

  return {
    base_amount: baseAmount,
    extra_fixed: extraFixed,
    extra_credit_cost: extraCreditCost,
    total_amount: totalAmount,
    items: paymentItems
  };
}

module.exports = { calculatePayment };
