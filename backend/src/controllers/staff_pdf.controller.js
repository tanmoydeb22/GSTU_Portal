const pool = require('../config/db');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { success, badRequest, notFound } = require('../utils/response');

// GET /api/staff/results/:semesterId/committee
async function getCommitteeMembers(req, res, next) {
  try {
    const { semesterId } = req.params;
    const [rows] = await pool.query('SELECT * FROM exam_committee WHERE semester_id = ? ORDER BY sl_no ASC', [semesterId]);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/staff/results/:semesterId/committee
async function addCommitteeMember(req, res, next) {
  try {
    const { semesterId } = req.params;
    const { name, role, member_type, sl_no } = req.body;
    if (!name || !role || !member_type || !sl_no) {
      return badRequest(res, "Missing required fields");
    }
    
    await pool.query(
      'INSERT INTO exam_committee (semester_id, name, role, member_type, sl_no) VALUES (?, ?, ?, ?, ?)',
      [semesterId, name, role, member_type, sl_no]
    );
    return success(res, { message: 'Member added' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/staff/results/:semesterId/committee/:id
async function removeCommitteeMember(req, res, next) {
  try {
    const { semesterId, id } = req.params;
    await pool.query('DELETE FROM exam_committee WHERE id = ? AND semester_id = ?', [id, semesterId]);
    return success(res, { message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

// Helper to convert GP to Letter (same as in other parts, used for fallback if needed, but we rely on DB)
const gpToLetter = (gp) => { 
  const val = parseFloat(gp);
  if (isNaN(val) || val < 0 || val > 4) return null;
  if (val === 4.0) return 'A+'; 
  if (val >= 3.75) return 'A'; 
  if (val >= 3.5) return 'A-'; 
  if (val >= 3.25) return 'B+'; 
  if (val >= 3.0) return 'B'; 
  if (val >= 2.75) return 'B-'; 
  if (val >= 2.5) return 'C+'; 
  if (val >= 2.25) return 'C'; 
  if (val >= 2.0) return 'D'; 
  return 'F'; 
};

// GET /api/staff/results/:semesterId/pdf
async function generateOfficialResultPDF(req, res, next) {
  try {
    const { semesterId } = req.params;
    const isAdmin = req.user && req.user.role === 'admin';
    const deptId = req.user ? req.user.deptId : null;

    // 1. Fetch semester and department details
    let semQuery = 'SELECT s.*, d.dept_name, d.dept_code FROM semester s JOIN department d ON s.dept_id = d.dept_id WHERE s.semester_id = ?';
    let semParams = [semesterId];
    if (!isAdmin) {
      semQuery += ' AND s.dept_id = ?';
      semParams.push(deptId);
    }
    const [semRows] = await pool.query(semQuery, semParams);
    if (semRows.length === 0) return notFound(res, 'Semester not found');
    const semester = semRows[0];
    const actualDeptId = semester.dept_id;

    // 2. Fetch Exam Committee
    const [committee] = await pool.query('SELECT * FROM exam_committee WHERE semester_id = ? ORDER BY sl_no ASC', [semesterId]);
    const examCommittee = committee.filter(c => c.member_type === 'committee');
    const tabulators = committee.filter(c => c.member_type === 'tabulator');

    if (tabulators.length === 0) {
      return badRequest(res, 'At least 1 tabulator is required to generate the official result.');
    }

    // 3. Fetch Result Data (similar to reports.controller.js)
    const query = `
      SELECT s.student_id, s.name, s.batch, s.session,
        c.course_code, c.credit, e.grade_point, e.grade_letter, e.status
      FROM student s
      JOIN enrollment e ON s.student_id = e.student_id
      JOIN course_offering co ON e.offering_id = co.offering_id
      JOIN course c ON co.course_id = c.course_id
      WHERE s.dept_id = ? AND co.semester_id = ?
      ORDER BY s.student_id, c.course_code
    `;
    const [rows] = await pool.query(query, [actualDeptId, semesterId]);

    const studentMap = {};
    rows.forEach(r => {
      if (!studentMap[r.student_id]) {
        studentMap[r.student_id] = { student_id: r.student_id, name: r.name, batch: r.batch, session: r.session, courses: [], totalPoints: 0, totalCreditsOffered: 0, totalCreditsSecured: 0, incomp: [] };
      }
      
      const cr = parseFloat(r.credit);
      const gp = r.grade_point !== null ? parseFloat(r.grade_point) : null;
      const letter = r.grade_letter || (gp !== null ? gpToLetter(gp) : '—');
      
      studentMap[r.student_id].courses.push({ course_code: r.course_code, credit: cr, grade_point: gp, grade_letter: letter });
      
      studentMap[r.student_id].totalCreditsOffered += cr;
      if (letter === 'F' || letter === '—') {
        studentMap[r.student_id].incomp.push(r.course_code);
      } else if (gp !== null) {
        studentMap[r.student_id].totalPoints += (gp * cr);
        studentMap[r.student_id].totalCreditsSecured += cr;
      }
    });

    const students = Object.values(studentMap).map(s => {
      s.gpa = s.totalCreditsOffered > 0 ? (s.totalPoints / s.totalCreditsOffered) : 0;
      return s;
    }).sort((a, b) => a.student_id.localeCompare(b.student_id));

    // Get unique courses for the table header
    const uniqueCourses = Array.from(new Set(rows.map(r => r.course_code))).sort();
    // Get credits for each course
    const courseCredits = {};
    rows.forEach(r => { courseCredits[r.course_code] = parseFloat(r.credit); });

    // 4. Generate HTML content
    
    // Semester Label Mapping
    const levelTermMap = {
      '1-1': 'First Year, Semester-1',
      '1-2': 'First Year, Semester-2',
      '2-1': 'Second Year, Semester-1',
      '2-2': 'Second Year, Semester-2',
      '3-1': 'Third Year, Semester-1',
      '3-2': 'Third Year, Semester-2',
      '4-1': 'Fourth Year, Semester-1',
      '4-2': 'Fourth Year, Semester-2'
    };
    const semesterLabel = levelTermMap[`${semester.level}-${semester.term}`] || `Year ${semester.level}, Term ${semester.term}`;
    
    const examId = `${semester.academic_year}-${semester.dept_code}-REG-${semester.level}-${semester.term}`;

    // Try to load logo
    let logoBase64 = '';
    try {
      const logoPath = path.join(__dirname, '../../../frontend/public/gstu_logo.png');
      const logoData = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
    } catch(e) {
      console.warn("Logo not found at", path.join(__dirname, '../../../frontend/public/gstu_logo.png'));
    }

    const generateHeader = () => `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; margin-bottom: 20px;">
        <div style="position: absolute; left: 0; top: 0;">
          ${logoBase64 ? `<img src="${logoBase64}" style="width: 50px; height: 50px;" />` : ''}
        </div>
        <div style="text-align: center;">
          <h1 style="font-size: 16px; font-weight: bold; margin: 0;">Gopalganj Science and Technology University</h1>
          <p style="font-size: 12px; color: gray; margin: 2px 0;">Gopalganj-8100, Bangladesh</p>
          <h2 style="font-size: 13px; font-weight: bold; text-decoration: underline; margin: 10px 0 0 0;">PUBLISHED RESULT (ON NOTICE BOARD)</h2>
        </div>
      </div>
      <div style="border: 1px solid #000; padding: 10px; font-size: 11px; margin-bottom: 20px; display: flex; flex-wrap: wrap;">
        <div style="width: 50%;"><b>Exam ID :</b> ${examId}</div>
        <div style="width: 50%;"><b>Degree :</b> B.Sc. Engg.</div>
        <div style="width: 50%; margin-top: 5px;"><b>Department :</b> ${semester.dept_name}</div>
        <div style="width: 50%; margin-top: 5px;"><b>Session :</b> ${semester.academic_year}</div>
        <div style="width: 100%; margin-top: 5px;"><b>Semester :</b> ${semesterLabel}</div>
      </div>
    `;

    const maxPerPage = 25;
    const pages = [];
    
    // Page 1...n: Grade Table
    for (let i = 0; i < students.length; i += maxPerPage) {
      const pageStudents = students.slice(i, i + maxPerPage);
      
      let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 70px;">Student ID</th>
              ${uniqueCourses.map(c => `<th class="course-header" style="border: 1px solid #000; padding: 4px; height: 80px; width: 28px; white-space: nowrap; writing-mode: vertical-lr; transform: rotate(180deg); text-align: left;">${c}<br/>CH:${courseCredits[c]}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${pageStudents.map((s, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'}">
                <td style="border: 1px solid #000; padding: 4px; text-align: left;">${s.student_id}</td>
                ${uniqueCourses.map(c => {
                  const sc = s.courses.find(crs => crs.course_code === c);
                  const grade = sc ? sc.grade_letter : '—';
                  const isF = grade === 'F';
                  return `<td style="border: 1px solid #000; padding: 4px; text-align: center; ${isF ? 'font-weight: bold; text-decoration: underline;' : ''}">${grade}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      pages.push(`
        <div class="page-break">
          ${generateHeader()}
          ${tableHtml}
        </div>
      `);
    }

    // Last Page: Summary Table
    let summaryHtml = `
      <div class="page-break">
        ${generateHeader()}
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 30px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 80px;">Student ID</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 50px;">Credit Offered</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 50px;">Credit Secured</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 60px;">Points Secured</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 55px;">GPA</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">Incomp.</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'}">
                <td style="border: 1px solid #000; padding: 4px; text-align: left;">${s.student_id}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.totalCreditsOffered.toFixed(1)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.totalCreditsSecured.toFixed(1)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.totalPoints.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.gpa.toFixed(3)}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: left;">${s.incomp.join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Signatures -->
        <div style="display: flex; justify-content: space-between; gap: 40px; margin-top: 50px;">
          <!-- Examination Committee -->
          <div style="flex: 1;">
            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 10px; font-size: 11px;">Examination Committee</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 30px;">SL</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">Name</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 80px;">Sign.</th>
                </tr>
              </thead>
              <tbody>
                ${examCommittee.map(c => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${c.sl_no}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: left; height: 30px;">${c.name}-<br/>${c.role}</td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Tabulators -->
          <div style="flex: 1;">
            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 10px; font-size: 11px;">Tabulators</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 30px;">SL</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: left;">Name</th>
                  <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 80px;">Sign.</th>
                </tr>
              </thead>
              <tbody>
                ${tabulators.map(t => `
                  <tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${t.sl_no}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: left; height: 30px;">${t.name}</td>
                    <td style="border: 1px solid #000; padding: 4px;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    pages.push(summaryHtml);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .page-break { page-break-after: always; position: relative; }
          .page-break:last-child { page-break-after: avoid; }
          th.course-header {
            writing-mode: vertical-lr;
            transform: rotate(180deg);
            white-space: nowrap;
            height: 80px;
            width: 28px;
            font-size: 8px;
            padding: 4px 2px;
            text-align: left;
            border: 1px solid #000;
          }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
      </html>
    `;

    // 5. Generate PDF with Puppeteer
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '15mm',
        left: '8mm',
        right: '8mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; font-family: Arial; text-align: center; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });
    
    await browser.close();

    const fileName = `GSTU_Result_${semester.dept_code}_L${semester.level}T${semester.term}_${semester.academic_year.replace('-', '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("PDF Generation Error:", err);
    next(err);
  }
}

module.exports = {
  getCommitteeMembers,
  addCommitteeMember,
  removeCommitteeMember,
  generateOfficialResultPDF
};
