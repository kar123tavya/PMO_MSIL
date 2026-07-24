// ═══════════════════════════════════════════════════════
//  services/cronService.js — Deadline Monitor
// ═══════════════════════════════════════════════════════
const cron = require('node-cron');
const { db } = require('../db/schema');
const { sendDeadlineAlert } = require('./emailService');

function initCronJobs() {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[Cron Service] Running daily deadline checks...');
    processDeadlines();
    processBenefitsTracking();
  });
  console.log('[Cron Service] Initialized daily deadline monitor (8:00 AM).');
}

async function processDeadlines() {
  try {
    // 1. Fetch active projects that have an assigned staff member
    const projects = db.prepare(`SELECT * FROM projects WHERE status NOT IN ('Live', 'Cancelled') AND assigned_staff_id IS NOT NULL AND assigned_staff_id != ''`).all();
    
    // 2. Fetch Senior Managers for escalation
    const seniors = db.prepare(`SELECT id, name, email FROM users WHERE role = 'senior_manager' AND status = 'active'`).all();
    
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const proj of projects) {
      if (!proj.il_phases) continue;
      
      let phases;
      try { phases = JSON.parse(proj.il_phases); } catch(e) { continue; }
      
      // Find the currently active phase (first phase that is not fully completed/does not have endDate)
      const currentPhase = phases.find(ph => !ph.endDate);
      if (!currentPhase || !currentPhase.startDate) continue;

      const targetDate = new Date(currentPhase.startDate);
      targetDate.setHours(0,0,0,0);

      // Calculate days difference
      const diffTime = targetDate - today;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Rules: Alert on 7, 3, and 0 days
      if (daysLeft === 7 || daysLeft === 3 || daysLeft === 0) {
        // Fetch assigned user
        const assignee = db.prepare(`SELECT id, name, email FROM users WHERE id = ?`).get(proj.assigned_staff_id);
        if (assignee) {
          const cc = (daysLeft <= 3) ? seniors : []; // Escalate to seniors if <= 3 days
          await sendDeadlineAlert(assignee, proj, daysLeft, cc);
        }
      }
    }
    console.log('[Cron Service] Finished processing deadlines.');
  } catch (error) {
    console.error('[Cron Service] Error processing deadlines:', error);
  }
}

async function processBenefitsTracking() {
  try {
    const today = new Date();
    const day = today.getDate();
    
    // We only care about the 7th, 10th, and 15th
    if (![7, 10, 15].includes(day)) return;

    console.log('[Cron Service] Running benefits tracking reminders for day', day);

    // Fetch all Live projects
    const liveProjects = db.prepare("SELECT * FROM projects WHERE status = 'Live'").all();
    if (liveProjects.length === 0) return;
    
    const { sendEmail } = require('../utils/mailer');
    const { uuidv4 } = require('../db/schema');

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
          
          const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all();
          ccEmails = admins.map(a => a.email);

          subject = `ESCALATION: Benefits Tracking Severely Overdue for Project ${proj.project}`;
          text = `Hello,\n\nThe benefits tracking for the project "${proj.project}" is severely overdue and has been escalated.\n\nThanks,\nPMO System`;
        }
      }

      toEmails = [...new Set(toEmails.filter(Boolean))];
      ccEmails = [...new Set(ccEmails.filter(Boolean))];

      if (toEmails.length > 0) {
        // Send real email (assuming emailService has sendEmail)
        try {
          await sendEmail(toEmails, subject, text, `<p>${text.replace(/\\n/g, '<br/>')}</p>`);
        } catch(e) {}

        // Create in-app notification
        const notifId = uuidv4();
        const isoNow = new Date().toISOString();
        try {
          db.prepare(`INSERT INTO notifications (id, type, title, body, to_users, cc_users, from_user, from_name, project_id, project_name, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
          ).run(notifId, 'general', subject, text, JSON.stringify(toEmails), JSON.stringify(ccEmails), 'system', 'PMO Cron', proj.id, proj.project, 'pending', isoNow);
        } catch(e) {}
      }
    }
  } catch(error) {
    console.error('[Cron Service] Error processing benefits tracking:', error);
  }
}

module.exports = {
  initCronJobs,
  processDeadlines,
  processBenefitsTracking
};
