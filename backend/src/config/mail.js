const nodemailer = require('nodemailer');
require('dotenv').config();

const port = parseInt(process.env.SMTP_PORT, 10) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: port,
  secure: port === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ''), // Remove spaces from app password
  },
});

// Verify transporter on startup
transporter.verify()
  .then(() => console.log('✅ Mail transporter ready (SSL: 465)'))
  .catch(err => {
    console.error('❌ Mail transporter configuration error:');
    console.error(err);
  });

module.exports = transporter;
