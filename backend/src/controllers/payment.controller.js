const pool = require('../config/db');
const { success, created, error, badRequest, notFound } = require('../utils/response');
const { calculatePayment } = require('../services/payment.service');
const SSLCommerzPayment = require('sslcommerz-lts');
const { sendNotification } = require('../services/notification.service');

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = process.env.IS_SANDBOX !== 'true'; // false for sandbox

// === STAFF: FEE STRUCTURE ===

async function getFees(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM fee_structure WHERE dept_id = ? ORDER BY academic_year DESC, level, term', [req.user.deptId]);
    return success(res, rows);
  } catch (err) { next(err); }
}

async function createFee(req, res, next) {
  try {
    const { academic_year, level, term, base_amount, per_course_fixed, per_credit_fee } = req.body;
    const [r] = await pool.query(
      'INSERT INTO fee_structure (dept_id, academic_year, level, term, base_amount, per_course_fixed, per_credit_fee) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.deptId, academic_year, level, term, base_amount, per_course_fixed, per_credit_fee]
    );
    return created(res, { fee_id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return badRequest(res, 'Fee structure already exists for this level/term/session');
    next(err);
  }
}

async function updateFee(req, res, next) {
  try {
    const { base_amount, per_course_fixed, per_credit_fee } = req.body;
    const [r] = await pool.query(
      'UPDATE fee_structure SET base_amount=?, per_course_fixed=?, per_credit_fee=? WHERE fee_id=? AND dept_id=?',
      [base_amount, per_course_fixed, per_credit_fee, req.params.id, req.user.deptId]
    );
    if (r.affectedRows === 0) return notFound(res);
    return success(res, null, 'Fee structure updated');
  } catch (err) { next(err); }
}

// === STAFF: PAYMENTS ===

async function getPayments(req, res, next) {
  try {
    const { semester_id, status, page = 1, limit = 25 } = req.query;
    let q = `
      SELECT p.*, s.name as student_name, s.level as student_level, s.term as student_term, sem.academic_year
      FROM payment p
      JOIN student s ON p.student_id = s.student_id
      JOIN semester sem ON p.semester_id = sem.semester_id
      WHERE sem.dept_id = ?
    `;
    const params = [req.user.deptId];
    if (semester_id) { q += ' AND p.semester_id = ?'; params.push(semester_id); }
    if (status) { q += ' AND p.status = ?'; params.push(status); }

    const cQ = 'SELECT COUNT(*) as total FROM payment p JOIN semester sem ON p.semester_id=sem.semester_id WHERE ' + q.split('WHERE')[1];
    const [cR] = await pool.query(cQ, params);

    q += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (page - 1) * limit);

    const [rows] = await pool.query(q, params);
    
    // Calculate summary statistics if requested
    const [stats] = await pool.query(`
      SELECT 
        SUM(total_amount) as total_expected,
        SUM(CASE WHEN status='Paid' THEN total_amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status='Paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status!='Paid' THEN 1 ELSE 0 END) as unpaid_count
      FROM payment p JOIN semester sem ON p.semester_id=sem.semester_id WHERE sem.dept_id = ?
      ${semester_id ? ' AND p.semester_id = ?' : ''}
    `, semester_id ? [req.user.deptId, semester_id] : [req.user.deptId]);

    return success(res, { 
      payments: rows, 
      stats: stats[0],
      total: cR[0].total, 
      page: parseInt(page), 
      totalPages: Math.ceil(cR[0].total / limit) 
    });
  } catch (err) { next(err); }
}

async function closeRegistrationAndGeneratePayments(req, res, next) {
  try {
    const { semester_id } = req.body;
    
    // 1. Verify semester belongs to dept
    const [sem] = await pool.query('SELECT * FROM semester WHERE semester_id=? AND dept_id=?', [semester_id, req.user.deptId]);
    if (!sem.length) return notFound(res, 'Semester not found');
    
    // 2. Find all students enrolled in this semester
    const [students] = await pool.query(`
      SELECT DISTINCT e.student_id 
      FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE co.semester_id = ? AND e.status = 'Registered'
    `, [semester_id]);

    let generatedCount = 0;

    for (const row of students) {
      const studentId = row.student_id;
      
      // Check if payment already exists
      const [existing] = await pool.query('SELECT payment_id FROM payment WHERE student_id=? AND semester_id=?', [studentId, semester_id]);
      if (existing.length) continue; // Skip if already generated

      const calc = await calculatePayment(studentId, semester_id);
      
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [pRes] = await conn.query(`
          INSERT INTO payment (student_id, semester_id, base_amount, extra_fixed, extra_credit_cost, total_amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [studentId, semester_id, calc.base_amount, calc.extra_fixed, calc.extra_credit_cost, calc.total_amount]);
        
        const paymentId = pRes.insertId;
        
        for (const item of calc.items) {
          await conn.query(`
            INSERT INTO payment_items (payment_id, offering_id, course_code, credit, item_type)
            VALUES (?, ?, ?, ?, ?)
          `, [paymentId, item.offering_id, item.course_code, item.credit, item.item_type]);
        }
        await conn.commit();
        generatedCount++;
      } catch (err) {
        await conn.rollback();
        console.error('Error generating payment for student', studentId, err);
      } finally {
        conn.release();
      }
    }

    // 3. Mark semester as locked/closed
    await pool.query('UPDATE semester SET is_active=0, is_locked=1 WHERE semester_id=?', [semester_id]);

    // Notify each student that their payment record has been generated
    for (const row of students) {
      sendNotification({
        userId: row.student_id,
        userType: 'student',
        title: 'Payment Due',
        message: 'Your semester registration has been finalized. Please proceed to the Payment section to complete your fee payment.',
        type: 'warning',
        link: '/student/payment',
      }).catch(err => console.error('[Notif] payment generated:', err.message));
    }

    return success(res, { generated_count: generatedCount }, `Registration closed. Generated ${generatedCount} payment records.`);
  } catch (err) { next(err); }
}

async function verifyPayment(req, res, next) {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['Paid', 'Rejected'].includes(status)) {
      return badRequest(res, 'Invalid status. Must be Paid or Rejected');
    }

    // Ensure payment exists and belongs to a semester in this department
    const [payments] = await pool.query(`
      SELECT p.* FROM payment p
      JOIN semester sem ON p.semester_id = sem.semester_id
      WHERE p.payment_id = ? AND sem.dept_id = ?
    `, [id, req.user.deptId]);

    if (!payments.length) return notFound(res, 'Payment not found');
    const p = payments[0];

    if (p.status !== 'Pending') {
      return badRequest(res, 'Can only verify payments that are Pending');
    }

    await pool.query('UPDATE payment SET status=?, paid_at=IF(?="Paid", NOW(), NULL) WHERE payment_id=?', [status, status, id]);
    
    // Notify the student of payment status
    const [studentInfo] = await pool.query('SELECT student_id FROM payment WHERE payment_id = ?', [id]);
    if (studentInfo.length > 0) {
      const studentId = studentInfo[0].student_id;
      if (status === 'Paid') {
        sendNotification({
          userId: studentId,
          userType: 'student',
          title: 'Payment Confirmed',
          message: 'Your semester fee payment has been verified and confirmed. Your enrollment is now complete.',
          type: 'success',
          link: '/student/payment/history',
        }).catch(err => console.error('[Notif] payment paid:', err.message));
      } else if (status === 'Rejected') {
        sendNotification({
          userId: studentId,
          userType: 'student',
          title: 'Payment Rejected',
          message: 'Your payment submission was rejected. Please re-submit with correct transaction details or contact the Section Officer.',
          type: 'error',
          link: '/student/payment',
        }).catch(err => console.error('[Notif] payment rejected:', err.message));
      }
    }

    return success(res, null, `Payment marked as ${status}`);
  } catch (err) { next(err); }
}

// === STUDENT: PAYMENTS ===

async function getMyPayment(req, res, next) {
  try {
    const studentId = req.user.userId;
    // Get the student's current active semester (or most recently active)
    const [studentRows] = await pool.query('SELECT dept_id, level, term FROM student WHERE student_id=?', [studentId]);
    if (!studentRows.length) return notFound(res);
    const s = studentRows[0];

    const [sem] = await pool.query('SELECT semester_id, academic_year, level, term FROM semester WHERE dept_id=? AND level=? AND term=? ORDER BY semester_id DESC LIMIT 1', [s.dept_id, s.level, s.term]);
    if (!sem.length) return success(res, null, 'No semester found');
    const semesterId = sem[0].semester_id;

    const [payments] = await pool.query('SELECT * FROM payment WHERE student_id=? AND semester_id=?', [studentId, semesterId]);
    if (payments.length) {
      const payment = payments[0];
      const [items] = await pool.query('SELECT * FROM payment_items WHERE payment_id=?', [payment.payment_id]);
      payment.items = items;
      return success(res, { payment, semester: sem[0] });
    }
    
    // Check if fee structure exists
    const [feeRows] = await pool.query(
      'SELECT * FROM fee_structure WHERE dept_id=? AND academic_year=? AND level=? AND term=?',
      [s.dept_id, sem[0].academic_year, s.level, s.term]
    );

    if (!feeRows.length) {
      return success(res, { payment: null, semester: sem[0], message: 'Fee structure not generated yet for this session' });
    }

    // Check if enrolled
    const [enrollments] = await pool.query(`
      SELECT e.enrollment_id FROM enrollment e
      JOIN course_offering co ON e.offering_id = co.offering_id
      WHERE e.student_id = ? AND co.semester_id = ? AND e.status = 'Registered'
    `, [studentId, semesterId]);

    if (!enrollments.length) {
      return success(res, { payment: null, semester: sem[0], message: 'Please register for courses first' });
    }

    // Generate on the fly
    const calc = await calculatePayment(studentId, semesterId);
    let newPaymentId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [pRes] = await conn.query(`
        INSERT INTO payment (student_id, semester_id, base_amount, extra_fixed, extra_credit_cost, total_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [studentId, semesterId, calc.base_amount, calc.extra_fixed, calc.extra_credit_cost, calc.total_amount]);
      
      newPaymentId = pRes.insertId;
      
      for (const item of calc.items) {
        await conn.query(`
          INSERT INTO payment_items (payment_id, offering_id, course_code, credit, item_type)
          VALUES (?, ?, ?, ?, ?)
        `, [newPaymentId, item.offering_id, item.course_code, item.credit, item.item_type]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [newPayments] = await pool.query('SELECT * FROM payment WHERE payment_id=?', [newPaymentId]);
    const payment = newPayments[0];
    const [items] = await pool.query('SELECT * FROM payment_items WHERE payment_id=?', [newPaymentId]);
    payment.items = items;

    return success(res, { payment, semester: sem[0] });
  } catch (err) { next(err); }
}

async function initiatePayment(req, res, next) {
  try {
    const { payment_id } = req.body;
    const studentId = req.user.userId;

    const [payments] = await pool.query(`
      SELECT p.*, s.name, s.email, s.phone 
      FROM payment p
      JOIN student s ON p.student_id = s.student_id
      WHERE p.payment_id=? AND p.student_id=?
    `, [payment_id, studentId]);
    
    if (!payments.length) return notFound(res, 'Payment record not found');
    const p = payments[0];

    if (p.status === 'Paid') return badRequest(res, 'Already paid');

    const transactionId = 'GSTU_' + Date.now() + '_' + payment_id;
    await pool.query('UPDATE payment SET status="Pending", transaction_id=?, gateway="SSLCommerz" WHERE payment_id=?', [transactionId, payment_id]);

    const data = {
      total_amount: p.total_amount,
      currency: 'BDT',
      tran_id: transactionId, // use unique tran_id for each api call
      success_url: `http://localhost:5001/api/payment/success`,
      fail_url: `http://localhost:5001/api/payment/fail`,
      cancel_url: `http://localhost:5001/api/payment/cancel`,
      ipn_url: `http://localhost:5001/api/payment/ipn`,
      shipping_method: 'Courier',
      product_name: 'Semester Fee',
      product_category: 'Education',
      product_profile: 'general',
      cus_name: p.name || 'Student',
      cus_email: p.email || 'student@gstu.ac.bd',
      cus_add1: 'GSTU Campus',
      cus_city: 'Gazipur',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: p.phone || '01711111111',
      ship_name: p.name || 'Student',
      ship_add1: 'GSTU Campus',
      ship_city: 'Gazipur',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
      // Redirect the user to payment gateway
      let GatewayPageURL = apiResponse.GatewayPageURL;
      return success(res, { checkout_url: GatewayPageURL, transaction_id: transactionId });
    }).catch(err => {
      return badRequest(res, 'Payment gateway initialization failed');
    });

  } catch (err) { next(err); }
}

async function submitManualPayment(req, res, next) {
  try {
    const { payment_id, transaction_id, payment_method } = req.body;
    const studentId = req.user.userId;

    if (!req.file) return badRequest(res, 'Receipt image is required');
    if (!transaction_id) return badRequest(res, 'Transaction ID is required');
    if (!payment_method) return badRequest(res, 'Payment method is required');

    const [payments] = await pool.query('SELECT * FROM payment WHERE payment_id=? AND student_id=?', [payment_id, studentId]);
    if (!payments.length) return notFound(res, 'Payment record not found');
    const p = payments[0];

    if (p.status === 'Paid') return badRequest(res, 'Already paid');

    const receipt_image_url = `/uploads/receipts/${req.file.filename}`;

    await pool.query(
      'UPDATE payment SET status="Pending", transaction_id=?, payment_method=?, receipt_image_url=? WHERE payment_id=?', 
      [transaction_id, payment_method, receipt_image_url, payment_id]
    );

    return success(res, null, 'Payment details submitted and pending verification.');
  } catch (err) { next(err); }
}

async function getPaymentHistory(req, res, next) {
  try {
    const studentId = req.user.userId;
    const [rows] = await pool.query(`
      SELECT p.*, sem.academic_year, sem.level, sem.term 
      FROM payment p 
      JOIN semester sem ON p.semester_id = sem.semester_id
      WHERE p.student_id = ?
      ORDER BY p.created_at DESC
    `, [studentId]);
    return success(res, rows);
  } catch (err) { next(err); }
}

// === GATEWAY CALLBACKS ===
// These are called via POST from SSLCommerz

async function gatewaySuccess(req, res, next) {
  try {
    // SSLCommerz sends validation data in req.body
    const val_id = req.body.val_id;
    const tran_id = req.body.tran_id;

    if (!val_id) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?error=ValidationFailed`);
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.validate({ val_id }).then(async (data) => {
      if (data.status === 'VALID' || data.status === 'VALIDATED') {
        await pool.query('UPDATE payment SET status="Paid", paid_at=NOW(), gateway="SSLCommerz", gateway_ref=? WHERE transaction_id=?', [val_id, tran_id]);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?success=true`);
      } else {
        await pool.query('UPDATE payment SET status="Failed" WHERE transaction_id=?', [tran_id]);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?error=PaymentFailed`);
      }
    }).catch(err => {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?error=ValidationException`);
    });

  } catch (err) { next(err); }
}

async function gatewayFail(req, res, next) {
  try {
    const tran_id = req.body.tran_id;
    if (tran_id) await pool.query('UPDATE payment SET status="Failed" WHERE transaction_id=?', [tran_id]);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?error=PaymentFailed`);
  } catch (err) { next(err); }
}

async function gatewayCancel(req, res, next) {
  try {
    const tran_id = req.body.tran_id;
    if (tran_id) await pool.query('UPDATE payment SET status="Failed" WHERE transaction_id=?', [tran_id]);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/student/payment?error=PaymentCanceled`);
  } catch (err) { next(err); }
}

async function gatewayIpn(req, res, next) {
  try {
    const val_id = req.body.val_id;
    const tran_id = req.body.tran_id;
    const status = req.body.status;

    if (status === 'VALID' && val_id) {
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.validate({ val_id }).then(async (data) => {
        if (data.status === 'VALID' || data.status === 'VALIDATED') {
          await pool.query('UPDATE payment SET status="Paid", paid_at=NOW(), gateway="SSLCommerz", gateway_ref=? WHERE transaction_id=?', [val_id, tran_id]);
        }
      }).catch(err => console.error('IPN Validation error', err));
    }
    return res.status(200).json({ received: true });
  } catch (err) { next(err); }
}

module.exports = {
  getFees, createFee, updateFee,
  getPayments, closeRegistrationAndGeneratePayments, verifyPayment,
  getMyPayment, initiatePayment, submitManualPayment, getPaymentHistory,
  gatewaySuccess, gatewayFail, gatewayCancel, gatewayIpn
};
