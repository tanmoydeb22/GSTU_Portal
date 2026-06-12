const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465, // Using SSL port for better Gmail compatibility
  secure: true,
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
