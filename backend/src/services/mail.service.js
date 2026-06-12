const transporter = require('../config/mail');

/**
 * Send a password reset email.
 */
async function sendResetEmail(toEmail, resetToken, userName) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'GSTU Portal — Password Reset',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f0fdf4; padding: 32px; border-radius: 12px;">
        <div style="background: #16a34a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GSTU Portal</h1>
          <p style="color: #dcfce7; margin: 4px 0 0;">Gopalganj Science & Technology University</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #bbf7d0;">
          <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #6b7280;">Hello <strong>${userName}</strong>,</p>
          <p style="color: #6b7280;">We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #16a34a; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <p style="color: #9ca3af; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br>${resetUrl}</p>
        </div>
      </div>
    `,
  };

  console.log(`📧 Attempting to send reset email to: ${toEmail}...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:');
    console.error(error);
    throw error;
  }
}

/**
 * Send a welcome email with temp password.
 */
async function sendWelcomeEmail(toEmail, userName, tempPassword, role) {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Welcome to GSTU Portal — Your Account',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f0fdf4; padding: 32px; border-radius: 12px;">
        <div style="background: #16a34a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GSTU Portal</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #bbf7d0;">
          <h2 style="color: #111827; margin-top: 0;">Welcome, ${userName}!</h2>
          <p style="color: #6b7280;">Your ${role} account has been created. Here are your login credentials:</p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; font-family: monospace;">
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #dc2626; font-size: 14px;">⚠️ You will be required to change this password on first login.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${loginUrl}" style="background: #16a34a; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Login Now
            </a>
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail, sendWelcomeEmail };
