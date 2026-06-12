const pool = require('../config/db');
const Papa = require('papaparse');
const { success, badRequest, notFound } = require('../utils/response');

// --- 1. RESULT REPORT ---
async function getResultReport(req, res, next) {
  try {
    const { semester_id, course_id, batch } = req.query;
    const deptId = req.user.deptId;
    let query = `
      SELECT s.student_id, s.name, s.batch, s.session,
        c.course_code, c.credit, e.grade_point, e.grade_letter, e.status
      FROM student s
      JOIN enrollment e ON s.student_id = e.student_id
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE s.dept_id = ?
    `;
    const params = [deptId];
    if (semester_id) { query += ' AND co.semester_id = ?'; params.push(semester_id); }
    if (course_id) { query += ' AND c.course_id = ?'; params.push(course_id); }
    if (batch) { query += ' AND s.batch = ?'; params.push(batch); }
    query += ' ORDER BY s.student_id, c.course_code';
    const [rows] = await pool.query(query, params);

    const studentMap = {};
    rows.forEach(r => {
      if (!studentMap[r.student_id]) {
        studentMap[r.student_id] = { student_id: r.student_id, name: r.name, batch: r.batch, session: r.session, courses: [], totalPoints: 0, totalCredits: 0 };
      }
      studentMap[r.student_id].courses.push({ course_code: r.course_code, credit: parseFloat(r.credit), grade_point: r.grade_point !== null ? parseFloat(r.grade_point) : null, grade_letter: r.grade_letter, status: r.status });
      if (r.grade_point !== null) {
        studentMap[r.student_id].totalPoints += (parseFloat(r.grade_point) * parseFloat(r.credit));
        studentMap[r.student_id].totalCredits += parseFloat(r.credit);
      }
    });

    const students = Object.values(studentMap).map(s => ({ ...s, semester_gpa: s.totalCredits > 0 ? (s.totalPoints / s.totalCredits).toFixed(2) : '0.00' }));
    const gpas = students.map(s => parseFloat(s.semester_gpa)).filter(g => g > 0);
    const distribution = { 'A+':0,'A':0,'A-':0,'B+':0,'B':0,'B-':0,'C+':0,'C':0,'D':0,'F':0,'Pending':0 };
    rows.forEach(r => {
      if (r.grade_letter && distribution[r.grade_letter] !== undefined) distribution[r.grade_letter]++;
      else if (!r.grade_letter) distribution['Pending']++;
    });

    return success(res, {
      students,
      summary: {
        avgGpa: gpas.length > 0 ? (gpas.reduce((a,b)=>a+b,0)/gpas.length).toFixed(2) : '0.00',
        highestGpa: gpas.length > 0 ? Math.max(...gpas).toFixed(2) : '0.00',
        lowestGpa: gpas.length > 0 ? Math.min(...gpas).toFixed(2) : '0.00',
        totalStudents: students.length
      },
      distribution
    });
  } catch (err) { next(err); }
}



async function exportResultReportPDF(req, res, next) {
  try {
    const { semester_id } = req.query;
    if (!semester_id) return badRequest(res, 'semester_id is required');

    const [semInfo] = await pool.query(
      'SELECT s.academic_year, s.level, s.term, d.dept_name, d.dept_code FROM semester s JOIN department d ON s.dept_id = d.dept_id WHERE s.semester_id = ? AND s.dept_id = ?',
      [semester_id, req.user.deptId]
    );
    if (!semInfo.length) return notFound(res, 'Semester not found');
    const { academic_year, level, term, dept_name, dept_code } = semInfo[0];

    const [courses] = await pool.query(
      'SELECT c.course_code, c.credit FROM course_offering co JOIN course c ON co.course_id = c.course_id WHERE co.semester_id = ? ORDER BY c.course_code',
      [semester_id]
    );

    const [enrollments] = await pool.query(
      `SELECT s.student_id, s.name, s.batch, c.course_code, c.credit, e.grade_point, e.grade_letter
       FROM student s
       JOIN enrollment e ON s.student_id = e.student_id
       JOIN course_offering co ON e.offering_id = co.offering_id
       JOIN course c ON co.course_id = c.course_id
       WHERE co.semester_id = ? AND s.dept_id = ?
       ORDER BY s.batch DESC, s.student_id ASC`,
      [semester_id, req.user.deptId]
    );

    const studentMap = new Map();
    enrollments.forEach(row => {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, { student_id: row.student_id, name: row.name, courses: {}, credit_offered: 0, credit_secured: 0, point_secured: 0, incompletes: [] });
      }
      const st = studentMap.get(row.student_id);
      st.courses[row.course_code] = row.grade_letter || '—';
      const credit = parseFloat(row.credit) || 0;
      st.credit_offered += credit;
      if (row.grade_point !== null) {
        if (row.grade_letter !== 'F' && row.grade_point > 0) { st.credit_secured += credit; st.point_secured += (credit * parseFloat(row.grade_point)); }
        else st.incompletes.push(row.course_code);
      } else st.incompletes.push(row.course_code);
    });

    const studentsList = Array.from(studentMap.values()).map(st => ({
      ...st,
      gpa: st.credit_offered > 0 ? (st.point_secured / st.credit_offered).toFixed(3) : '0.000',
      point_secured: st.point_secured.toFixed(2),
      incompletes_str: st.incompletes.join(', ')
    }));

    const courseCodes = courses.map(c => ({ code: c.course_code, credit: parseFloat(c.credit).toString() }));
    const studentsWithGrades = studentsList.map(st => ({ ...st, grades: courseCodes.map(c => st.courses[c.code] || '—') }));

    const examId = `${academic_year}-${dept_code}-REG-${level}-${term}`;
    const semesterName = `Year-${level}, Semester-${term}`;

    const courseHeaderCells = courseCodes.map(c => `<th><div class="vh"><span>${c.code}</span><br/><span style="font-weight:normal;font-size:8px;">CH: ${c.credit}</span></div></th>`).join('');
    const studentGradeRows = studentsWithGrades.map(st => `<tr><td class="sid">${st.student_id}</td>${st.grades.map(g => `<td>${g}</td>`).join('')}</tr>`).join('');
    const studentSummaryRows = studentsWithGrades.map(st => `<tr><td class="sid">${st.student_id}</td><td>${st.credit_offered}</td><td>${st.credit_secured}</td><td>${st.point_secured}</td><td style="font-weight:bold;">${st.gpa}</td><td style="text-align:left;font-size:8px;">${st.incompletes_str}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;font-size:10px;color:#000;margin:0;padding:0;}
      .header{text-align:center;margin-bottom:12px;}
      .uni-name{font-size:17px;font-weight:bold;}
      .pub-notice{font-size:11px;font-weight:bold;margin-top:4px;}
      .meta-box{border:1px solid #000;border-radius:6px;padding:6px 12px;margin-bottom:15px;display:flex;flex-wrap:wrap;}
      .mi{width:50%;margin-bottom:4px;font-weight:bold;}
      .mi span{font-weight:normal;margin-left:8px;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;table-layout:fixed;page-break-inside:auto;}
      tr{page-break-inside:avoid;}
      th,td{border:1px solid #000;padding:3px;text-align:center;font-size:9px;}
      .sid{width:70px;font-weight:bold;}
      .vh{writing-mode:vertical-rl;transform:rotate(180deg);height:75px;padding:4px;line-height:1.2;text-align:left;}
      .sum-table{width:65%;}
      .sig-area{margin-top:30px;display:flex;justify-content:space-between;}
      .sig-box{width:45%;}
      .sig-title{font-weight:bold;text-decoration:underline;margin-bottom:8px;}
      .sig-tbl th,.sig-tbl td{padding:5px;text-align:left;}
      .sig-tbl th{background:#f0f0f0;}
    </style></head><body>
      <div class="header">
        <div class="uni-name">Gopalganj Science and Technology University</div>
        <div style="font-size:10px;">Gopalganj-8100, Bangladesh</div>
        <div class="pub-notice">PUBLISHED RESULT (ON NOTICE BOARD)</div>
      </div>
      <div class="meta-box">
        <div class="mi">Exam ID<span style="margin-left:30px;">: ${examId}</span></div>
        <div class="mi">Degree<span style="margin-left:27px;">: B.Sc. Engg.</span></div>
        <div class="mi">Department<span style="margin-left:10px;">: Department of ${dept_name}</span></div>
        <div class="mi"></div>
        <div class="mi">Session<span style="margin-left:32px;">: ${academic_year}</span></div>
        <div class="mi">Semester<span style="margin-left:18px;">: ${semesterName}</span></div>
      </div>
      <table><thead><tr><th class="sid">Student ID</th>${courseHeaderCells}</tr></thead><tbody>${studentGradeRows}</tbody></table>
      <table class="sum-table"><thead><tr>
        <th class="sid">Student ID</th>
        <th style="width:38px;"><div class="vh">Credit<br/>Offered</div></th>
        <th style="width:38px;"><div class="vh">Credit<br/>Secured</div></th>
        <th style="width:38px;"><div class="vh">Point<br/>Secured</div></th>
        <th style="width:38px;"><div class="vh" style="height:55px;">GPA</div></th>
        <th><div class="vh">Incomp.</div></th>
      </tr></thead><tbody>${studentSummaryRows}</tbody></table>
      <div class="sig-area">
        <div class="sig-box">
          <div class="sig-title">Examination Committee</div>
          <table class="sig-tbl"><tr><th style="width:25px;">SL</th><th>Name</th><th>Signature</th></tr>
          <tr><td>1</td><td style="height:22px;"></td><td></td></tr>
          <tr><td>2</td><td></td><td></td></tr>
          <tr><td>3</td><td></td><td></td></tr></table>
        </div>
        <div class="sig-box" style="width:38%;">
          <div class="sig-title">Tabulators</div>
          <table class="sig-tbl"><tr><th style="width:25px;">SL</th><th>Name</th><th>Signature</th></tr>
          <tr><td>1</td><td style="height:22px;"></td><td></td></tr>
          <tr><td>2</td><td></td><td></td></tr></table>
        </div>
      </div>
    </body></html>`;

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' } });
    await browser.close();

    res.setHeader('Content-disposition', `attachment; filename="Result_Report_L${level}T${term}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}


// --- 2. COURSE FAILURE RATE ---
async function getFailureRates(req, res, next) {
  try {
    const { semester_id } = req.query;
    if (!semester_id) return badRequest(res, 'semester_id is required');
    const [rows] = await pool.query(`
      SELECT c.course_code, c.course_name, COUNT(e.enrollment_id) as total_students,
        SUM(CASE WHEN e.grade_point < 2.00 OR e.grade_letter = 'F' THEN 1 ELSE 0 END) as failed_students
      FROM course_offering co JOIN course c ON co.course_id = c.course_id
      LEFT JOIN enrollment e ON co.offering_id = e.offering_id
      WHERE co.semester_id = ? AND c.dept_id = ? GROUP BY c.course_id ORDER BY c.course_code
    `, [semester_id, req.user.deptId]);
    const data = rows.map(r => ({ ...r, passed_students: r.total_students - r.failed_students, failure_rate: parseFloat(((r.total_students > 0 ? r.failed_students/r.total_students : 0)*100).toFixed(1)) }));
    return success(res, data);
  } catch (err) { next(err); }
}

// --- 3. PAYMENT COLLECTION ---
async function getPayments(req, res, next) {
  try {
    const { semester_id, status } = req.query;
    let query = `SELECT p.payment_id, p.total_amount, p.status, p.paid_at, p.base_amount, p.extra_fixed, p.extra_credit_cost, s.student_id, s.name, s.batch FROM payment p JOIN student s ON p.student_id = s.student_id WHERE s.dept_id = ?`;
    const params = [req.user.deptId];
    if (semester_id) { query += ' AND p.semester_id = ?'; params.push(semester_id); }
    if (status) { query += ' AND p.status = ?'; params.push(status); }
    const [rows] = await pool.query(query, params);
    let expected = 0, collected = 0, pending = 0;
    rows.forEach(r => { const amt = parseFloat(r.total_amount)||0; expected+=amt; if(r.status==='Paid') collected+=amt; else pending+=amt; });
    return success(res, { payments: rows, summary: { expected, collected, pending } });
  } catch (err) { next(err); }
}

async function exportPaymentsCSV(req, res, next) {
  try {
    const { semester_id, status } = req.query;
    let query = `SELECT s.student_id, s.name, p.base_amount, (p.extra_fixed + p.extra_credit_cost) as extra_fee, p.total_amount, p.status, p.paid_at FROM payment p JOIN student s ON p.student_id = s.student_id WHERE s.dept_id = ?`;
    const params = [req.user.deptId];
    if (semester_id) { query += ' AND p.semester_id = ?'; params.push(semester_id); }
    if (status) { query += ' AND p.status = ?'; params.push(status); }
    const [rows] = await pool.query(query, params);
    const csvData = rows.map(r => ({ 'Student ID': r.student_id, 'Name': r.name, 'Base Fee': r.base_amount, 'Extra Fee': r.extra_fee, 'Total': r.total_amount, 'Status': r.status, 'Paid At': r.paid_at ? new Date(r.paid_at).toLocaleDateString() : 'N/A' }));
    const csvStr = Papa.unparse(csvData);
    res.setHeader('Content-disposition', 'attachment; filename="Payments_Report.csv"');
    res.setHeader('Content-type', 'text/csv');
    res.send(csvStr);
  } catch (err) { next(err); }
}

// --- 4. STUDENT PERFORMANCE TREND ---
async function getPerformanceTrend(req, res, next) {
  try {
    const { batch } = req.query;
    let query = `SELECT s.batch, e.level, e.term, AVG(e.grade_point) as avg_gpa FROM enrollment e JOIN student s ON e.student_id = s.student_id WHERE s.dept_id = ? AND e.status = 'Completed' AND e.grade_point IS NOT NULL`;
    const params = [req.user.deptId];
    if (batch) { query += ' AND s.batch = ?'; params.push(batch); }
    query += ' GROUP BY s.batch, e.level, e.term ORDER BY s.batch, e.level, e.term';
    const [rows] = await pool.query(query, params);
    const termsMap = {};
    rows.forEach(r => {
      const label = `L${r.level}T${r.term}`;
      if (!termsMap[label]) termsMap[label] = { termLabel: label, level: r.level, term: r.term };
      termsMap[label][r.batch] = parseFloat(parseFloat(r.avg_gpa).toFixed(2));
    });
    return success(res, Object.values(termsMap).sort((a,b) => (a.level*10+a.term) - (b.level*10+b.term)));
  } catch (err) { next(err); }
}

module.exports = { getResultReport, exportResultReportPDF, getFailureRates, getPayments, exportPaymentsCSV, getPerformanceTrend };
