const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter only if SMTP settings are provided
let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an approval notification email to a list of recipients.
 * @param {Array<string>} emails - Array of recipient email addresses
 * @param {Object} changeData - Data regarding the project edit
 */
async function sendApprovalEmail(emails, changeData) {
  if (!emails || emails.length === 0) return;

  const subject = `[PMO Dashboard] Approval Required: Project Update - ${changeData.projectName}`;
  const html = `
    <h2>Project Update Pending Approval</h2>
    <p><strong>Project:</strong> ${changeData.projectName}</p>
    <p><strong>Changed By:</strong> ${changeData.requestedBy}</p>
    <p><strong>Division:</strong> ${changeData.division}</p>
    <p>A Person In Charge (PIC) has submitted changes to the above project. 
       This requires approval from the Section Head, Division Head, or Department Head.</p>
    <p>Please log in to the PMO Dashboard to review and approve/reject these changes.</p>
    <br/>
    <p><i>Note: If any of the Heads approves this request, it will be automatically committed to the database.</i></p>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"PMO System" <noreply@maruti.co.in>',
        to: emails.join(','),
        subject,
        html,
      });
      console.log(`[Email] Approval email sent to: ${emails.join(', ')}`);
    } catch (err) {
      console.error('[Email] Failed to send email:', err);
    }
  } else {
    console.log(`\n--- MOCK EMAIL ---`);
    console.log(`To: ${emails.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.replace(/<[^>]+>/g, '')}`);
    console.log(`------------------\n`);
  }
}

module.exports = {
  sendApprovalEmail,
};
