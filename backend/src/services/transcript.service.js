const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const QRCode = require('qrcode');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getGradeClass(gradeLetter) {
  const map = {
    'A+': 'aplus', 'A': 'a', 'A-': 'aminus',
    'B+': 'bplus', 'B': 'b', 'B-': 'bminus',
    'C+': 'cplus', 'C': 'c',
    'D': 'd', 'F': 'f'
  };
  return map[gradeLetter] || 'b';
}

function calculateSemGPA(courses) {
  let totalCr = 0;
  let totalPt = 0;
  for (const c of courses) {
    const cr = parseFloat(c.credit) || 0;
    const gp = parseFloat(c.grade_point);
    totalCr += cr;
    if (!isNaN(gp)) totalPt += gp * cr;
  }
  return totalCr > 0 ? (totalPt / totalCr).toFixed(3) : '—';
}

function prepareSemesters(semesters) {
  return semesters.map((sem, index) => {
    // Force a page break after every 2 semesters, unless it's the last one
    const isPageBreak = (index % 2 === 1) && (index !== semesters.length - 1);
    return {
      ...sem,
      hasManyCourses: sem.courses.length > 12,
      semesterGPA: calculateSemGPA(sem.courses),
      totalCredits: sem.courses.reduce((s, c) => s + parseFloat(c.credit), 0).toFixed(1),
      isPageBreak,
      courses: sem.courses.map(c => ({
        ...c,
        gradeClass: getGradeClass(c.grade_letter),
        grade_point: c.grade_point !== null ? parseFloat(c.grade_point).toFixed(2) : '—',
        credit: parseFloat(c.credit).toFixed(1)
      }))
    };
  });
}

function groupBySemester(records) {
  const map = {};
  for (const r of records) {
    const key = `${r.level}-${r.term}`;
    if (!map[key]) map[key] = { level: r.level, term: r.term, academic_year: r.academic_year, courses: [] };
    map[key].courses.push(r);
  }
  return Object.values(map).sort((a, b) => a.level - b.level || a.term - b.term);
}

function formatPrintDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ─── HTML TEMPLATE ────────────────────────────────────────────────────────────

const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  /* ── RESET ── */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    color: #111827;
    background: white;
    position: relative;
  }

  /* ── WATERMARK (FIXED: behind all content) ── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 72px;
    font-weight: 900;
    color: #16a34a;
    opacity: 0.05;
    white-space: nowrap;
    z-index: 0;
    pointer-events: none;
    letter-spacing: 8px;
    user-select: none;
  }

  /* ── ALL CONTENT ABOVE WATERMARK ── */
  .content-wrapper {
    position: relative;
    z-index: 1;
  }

  /* ── HEADER ── */
  .header {
    text-align: center;
    padding-bottom: 12px;
    border-bottom: 2px solid #16a34a;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 800;
    color: #111827;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .header p {
    font-size: 11px;
    color: #6b7280;
    margin-top: 3px;
  }
  .header .badge {
    display: inline-block;
    background: #16a34a;
    color: white;
    padding: 4px 20px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    margin-top: 8px;
    letter-spacing: 2px;
  }

  /* ── STUDENT INFO BOX ── */
  .student-info {
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    padding: 12px 16px;
    background: #f0fdf4;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .student-info h3 {
    font-size: 10px;
    font-weight: 700;
    color: #16a34a;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
    border-bottom: 1px solid #bbf7d0;
    padding-bottom: 6px;
  }
  .student-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 30px;
  }
  .info-row {
    display: flex;
    gap: 8px;
  }
  .info-label {
    font-weight: 600;
    color: #374151;
    min-width: 110px;
    font-size: 10.5px;
  }
  .info-value {
    color: #111827;
    font-size: 10.5px;
  }

  /* ── SECTION TITLE ── */
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
  }

  /* ── SEMESTER BLOCK (KEY FIX: no split across pages) ── */
  .semester-block {
    margin-bottom: 16px;
    page-break-inside: avoid;  /* CRITICAL: prevents splitting */
    break-inside: avoid;        /* Modern CSS */
  }

  /* If semester is too large (many courses), allow break before */
  .semester-block.allow-break {
    page-break-inside: auto;
    break-inside: auto;
  }
  .semester-block.allow-break .semester-table tbody tr {
    page-break-inside: avoid;  /* Still keep rows intact */
    break-inside: avoid;
  }

  /* ── SEMESTER HEADER (stays with first row) ── */
  .semester-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
    page-break-after: avoid;   /* CRITICAL: header stays with table */
    break-after: avoid;
  }
  .semester-badge {
    background: #16a34a;
    color: white;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .semester-year {
    font-size: 10px;
    color: #6b7280;
  }

  /* ── TABLE ── */
  .semester-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  .semester-table thead tr {
    background: #16a34a;
    color: white;
    page-break-after: avoid;
    break-after: avoid;
  }
  .semester-table thead th {
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .semester-table thead th:nth-child(3),
  .semester-table thead th:nth-child(4),
  .semester-table thead th:nth-child(5) {
    text-align: center;
  }
  .semester-table tbody tr {
    border-bottom: 1px solid #f3f4f6;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .semester-table tbody tr:nth-child(even) {
    background: #f9fafb;
  }
  .semester-table tbody td {
    padding: 6px 10px;
    color: #374151;
  }
  .semester-table tbody td:nth-child(3),
  .semester-table tbody td:nth-child(4),
  .semester-table tbody td:nth-child(5) {
    text-align: center;
  }
  
  /* Grade colors */
  .grade-badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 10px;
  }
  .grade-aplus { background:#dcfce7; color:#166534; }
  .grade-a     { background:#dcfce7; color:#166534; }
  .grade-aminus{ background:#d1fae5; color:#065f46; }
  .grade-bplus { background:#dbeafe; color:#1e40af; }
  .grade-b     { background:#dbeafe; color:#1e40af; }
  .grade-bminus{ background:#e0f2fe; color:#0369a1; }
  .grade-cplus { background:#fef9c3; color:#854d0e; }
  .grade-c     { background:#fef9c3; color:#854d0e; }
  .grade-d     { background:#ffedd5; color:#9a3412; }
  .grade-f     { background:#fee2e2; color:#991b1b; }

  /* ── SEMESTER SUMMARY ROW ── */
  .semester-summary {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .semester-summary td {
    background: #f0fdf4 !important;
    padding: 7px 10px;
    font-weight: 700;
    color: #166534;
    border-top: 2px solid #bbf7d0;
  }
  .gpa-value {
    color: #16a34a;
    font-size: 12px;
    font-weight: 800;
  }

  /* ── OVERALL SUMMARY BOX ── */
  .overall-summary {
    margin-top: 20px;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-before: auto;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 14px;
  }
  .summary-item {
    text-align: center;
  }
  .summary-item .label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }
  .summary-item .value {
    font-size: 20px;
    font-weight: 800;
    color: #16a34a;
  }
  .summary-item .sub {
    font-size: 9px;
    color: #9ca3af;
    margin-top: 2px;
  }
  /* Dividers between summary items */
  .summary-item:not(:last-child) {
    border-right: 1px solid #bbf7d0;
  }

  /* ── SIGNATURE SECTION (FIXED ALIGNMENT) ── */
  .signature-section {
    margin-top: 30px;
    page-break-inside: avoid;
    break-inside: avoid;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: end;
  }
  .signature-block {
    display: flex;
    flex-direction: column;
  }
  .signature-line {
    border-top: 1px solid #374151;
    padding-top: 6px;
    margin-top: 30px;   /* space for actual signature */
    font-size: 10px;
    font-weight: 600;
    color: #374151;
  }
  .signature-sub {
    font-size: 9px;
    color: #6b7280;
    margin-top: 2px;
  }
  /* QR Code block (right side, below Head of Dept) */
  .qr-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .qr-block img {
    width: 80px;
    height: 80px;
    border: 1px solid #e5e7eb;
    padding: 4px;
    border-radius: 4px;
  }
  .qr-caption {
    font-size: 8px;
    color: #9ca3af;
    text-align: center;
    width: 80px;
  }
</style>
</head>
<body>
  <!-- WATERMARK: behind everything -->
  <div class="watermark">OFFICIAL TRANSCRIPT</div>

  <!-- ALL CONTENT -->
  <div class="content-wrapper">

    <!-- HEADER -->
    <div class="header">
      <h1>Gopalganj Science &amp; Technology University</h1>
      <p>Gopalganj-8100, Bangladesh</p>
      <div class="badge">OFFICIAL ACADEMIC TRANSCRIPT</div>
    </div>

    <!-- STUDENT INFO -->
    <div class="student-info">
      <h3>Student Information</h3>
      <div class="student-info-grid">
        <div class="info-row">
          <span class="info-label">Student Name</span>
          <span class="info-value">: {{student.name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Session</span>
          <span class="info-value">: {{student.session}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Student ID</span>
          <span class="info-value">: {{student.student_id}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Overall CGPA</span>
          <span class="info-value">: {{student.cgpa}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Department</span>
          <span class="info-value">: {{student.dept_name}}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Print Date</span>
          <span class="info-value">: {{printDate}}</span>
        </div>
      </div>
    </div>

    <!-- ACADEMIC RECORD -->
    <div class="section-title">Academic Record</div>

    <!-- LOOP: for each semester -->
    {{#each semesters}}
    <div class="semester-block {{#if hasManyCourses}}allow-break{{/if}}">
      
      <div class="semester-header">
        <span class="semester-badge">
          Level {{level}} — Term {{term}}
        </span>
        <span class="semester-year">
          Academic Year: {{academic_year}}
        </span>
      </div>

      <table class="semester-table">
        <thead>
          <tr>
            <th style="width:12%">CODE</th>
            <th style="width:52%">COURSE NAME</th>
            <th style="width:10%">CR</th>
            <th style="width:13%">GRADE</th>
            <th style="width:13%">POINT</th>
          </tr>
        </thead>
        <tbody>
          {{#each courses}}
          <tr>
            <td>{{course_code}}</td>
            <td>{{course_name}}</td>
            <td>{{credit}}</td>
            <td style="text-align:center">
              <span class="grade-badge grade-{{gradeClass}}">
                {{grade_letter}}
              </span>
            </td>
            <td style="text-align:center">
              {{grade_point}}
            </td>
          </tr>
          {{/each}}
          
          <!-- Semester Summary Row (kept with table) -->
          <tr class="semester-summary">
            <td colspan="2" style="text-align:right; font-weight:700;">
              Semester Summary
            </td>
            <td style="text-align:center; font-weight:700;">
              {{totalCredits}}
            </td>
            <td style="text-align:center; font-size:9px; color:#6b7280">
              GPA:
            </td>
            <td style="text-align:center">
              <span class="gpa-value">{{semesterGPA}}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    {{#if isPageBreak}}
    <div style="page-break-after: always;"></div>
    {{/if}}
    {{/each}}



    <!-- SIGNATURE SECTION (FIXED: uses grid, no overlap) -->
    <div class="signature-section">
      
      <!-- Left: Controller of Examinations -->
      <div class="signature-block">
        <div class="signature-line">
          Controller of Examinations
          <div class="signature-sub">GSTU</div>
        </div>
      </div>

      <!-- Right: Head of Department + QR Code -->
      <div class="qr-block">
        <img src="{{qrCodeDataUrl}}" alt="Verification QR Code" />
        <div class="qr-caption">Scan to verify</div>
        <div class="signature-line" style="width:100%; text-align:right">
          Head of Department
          <div class="signature-sub">{{student.dept_name}}</div>
        </div>
      </div>
    </div>

  </div><!-- end content-wrapper -->
</body>
</html>
`;

// Compile Handlebars template once
const compiledTemplate = handlebars.compile(htmlTemplate);

/**
 * Generate the official GSTU transcript PDF using Puppeteer.
 * @param {Object} student  - Student row (with dept_name)
 * @param {Array}  records  - Completed enrollment records
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateTranscriptPDF(student, records) {
  const grouped = groupBySemester(records);
  const semesters = prepareSemesters(grouped);

  const qrUrl = `https://gstuportal.com/verify/${student.student_id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 160,
    margin: 1,
    color: { dark: '#166534', light: '#ffffff' }
  });

  student.cgpa = parseFloat(student.cgpa || 0).toFixed(3);
  student.total_credit_completed = parseFloat(student.total_credit_completed || 0).toFixed(1);

  const html = compiledTemplate({
    student,
    semesters,
    qrCodeDataUrl,
    printDate: formatPrintDate(),
    status: 'Continuing'
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // as requested
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="
          width: 100%;
          font-size: 9px;
          font-family: Arial, sans-serif;
          color: #6b7280;
          padding: 0 15mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span>This transcript is valid only with official seal and signature of the Controller of Examinations, GSTU.</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateTranscriptPDF };
