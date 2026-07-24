const cron = require('node-cron');
const { db, uuidv4 } = require('./db/schema');
const { sendEmail } = require('./utils/mailer');

function startCronJobs(broadcastFn) {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily cron job for benefits tracking reminders...');
    const now = new Date();
    const day = now.getDate();
    
    // We only care about the 7th, 10th, and 15th
    if (![7, 10, 15].includes(day)) return;

    // Fetch all Live projects
    const liveProjects = db.prepare("SELECT * FROM projects WHERE status = 'Live'").all();
    if (liveProjects.length === 0) return;

    for (const proj of liveProjects) {
      const picEmail = proj.assigned_to;
      const buEmail = proj.bu_email;

      let toEmails = [];
      let ccEmails = [];
      let subject = '';
      let text = '';

      if (day === 7) {
        // Email to PIC and BU
        if (picEmail) toEmails.push(picEmail);
        if (buEmail) toEmails.push(buEmail);
        subject = `Reminder: Benefits Tracking for Project ${proj.project}`;
        text = `Hello,\n\nPlease remember to update the benefits tracking for the project "${proj.project}".\n\nThanks,\nPMO System`;
      } else if (day === 10) {
        // Email to DPM
        // Find PIC's DPM
        if (picEmail) {
          const picUser = db.prepare('SELECT manager_email, role FROM users WHERE email=?').get(picEmail);
          let dpmEmail = null;
          if (picUser && picUser.role === 'pic') {
            const tl = db.prepare('SELECT manager_email FROM users WHERE email=?').get(picUser.manager_email);
            if (tl) {
              const sic = db.prepare('SELECT manager_email FROM users WHERE email=?').get(tl.manager_email);
              if (sic) dpmEmail = sic.manager_email;
            }
          }
          if (dpmEmail) toEmails.push(dpmEmail);
          
          subject = `Reminder: Benefits Tracking Overdue for Project ${proj.project}`;
          text = `Hello DPM,\n\nThe benefits tracking for the project "${proj.project}" is overdue.\n\nThanks,\nPMO System`;
        }
      } else if (day === 15) {
        // Escalation to DPM & Divisional Head
        // We will just send to DPM for now and mark as escalation
        if (picEmail) {
          const picUser = db.prepare('SELECT manager_email, role FROM users WHERE email=?').get(picEmail);
          let dpmEmail = null;
          if (picUser && picUser.role === 'pic') {
            const tl = db.prepare('SELECT manager_email FROM users WHERE email=?').get(picUser.manager_email);
            if (tl) {
              const sic = db.prepare('SELECT manager_email FROM users WHERE email=?').get(tl.manager_email);
              if (sic) dpmEmail = sic.manager_email;
            }
          }
          if (dpmEmail) toEmails.push(dpmEmail);
          
          // Assuming Admin is Divisional Head for now
          const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
          ccEmails = admins.map(a => a.email);

          subject = `ESCALATION: Benefits Tracking Severely Overdue for Project ${proj.project}`;
          text = `Hello,\n\nThe benefits tracking for the project "${proj.project}" is severely overdue and has been escalated.\n\nThanks,\nPMO System`;
        }
      }

      toEmails = [...new Set(toEmails.filter(Boolean))];
      ccEmails = [...new Set(ccEmails.filter(Boolean))];

      if (toEmails.length > 0) {
        // Send real email
        await sendEmail({
          to: toEmails.join(','),
          subject,
          text
        });

        // Also create in-app notification
        const notifId = uuidv4();
        const isoNow = new Date().toISOString();
        db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, cc_users, from_user, from_name, project_id, project_name, status, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(notifId, 'general', subject, text, JSON.stringify(toEmails), JSON.stringify(ccEmails), 'system', 'PMO Cron', proj.id, proj.project, 'pending', isoNow);
        
        if (broadcastFn) {
          broadcastFn('notification_new', { id: notifId, type: 'general', title: subject });
        }
      }
    }
  });
}

module.exports = { startCronJobs };
