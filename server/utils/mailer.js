const nodemailer = require('nodemailer');

// Set up transporter with placeholders
// User will provide these in their .env later
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"PMO SafaaiLoop" <${process.env.SMTP_USER || 'no-reply@example.com'}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    // Suppress error so it doesn't crash the server since SMTP is likely not configured yet
    return false;
  }
}

module.exports = { sendEmail };
