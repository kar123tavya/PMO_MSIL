// ═══════════════════════════════════════════════════════
//  services/emailService.js — Nodemailer Service
// ═══════════════════════════════════════════════════════
const nodemailer = require('nodemailer');

// TODO: Replace with Maruti Suzuki SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'ethereal.user@ethereal.email',
    pass: 'etherealpassword'
  }
});

async function sendDeadlineAlert(user, project, daysLeft, ccSeniors = []) {
  if (!user || !user.email) return;

  const subject = daysLeft === 0 
    ? `🚨 OVERDUE: PMO Project Deadline - ${project.project}` 
    : `⏰ REMINDER: Project Deadline in ${daysLeft} Days - ${project.project}`;

  const ccEmails = ccSeniors.map(s => s.email).filter(Boolean);

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${daysLeft === 0 ? '#dc2626' : '#2563eb'}; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">PMO Dashboard Alert</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${user.name},</p>
        <p>This is an automated reminder regarding the following project assigned to you:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Project Code</td><td style="padding: 8px; border: 1px solid #ddd;">${project.parentCode || '—'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Project Name</td><td style="padding: 8px; border: 1px solid #ddd;">${project.project}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Division</td><td style="padding: 8px; border: 1px solid #ddd;">${project.division || '—'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td><td style="padding: 8px; border: 1px solid #ddd; color: ${daysLeft === 0 ? '#dc2626' : '#eab308'}; font-weight: bold;">${daysLeft === 0 ? 'OVERDUE' : `${daysLeft} Days Remaining`}</td></tr>
        </table>

        <p>Please log in to the PMO Dashboard to update the status and milestones.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
          <p>This is an automatically generated email. Please do not reply.</p>
          <p>&copy; Maruti Suzuki PMO</p>
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"PMO Dashboard" <pmo-noreply@maruti.co.in>',
      to: user.email,
      cc: ccEmails,
      subject: subject,
      html: html,
    });
    console.log(`[Email Service] Sent alert for project ${project.project} to ${user.email} (Preview: ${nodemailer.getTestMessageUrl(info) || 'N/A'})`);
  } catch (error) {
    console.error('[Email Service] Failed to send email:', error);
  }
}

module.exports = {
  sendDeadlineAlert
};
