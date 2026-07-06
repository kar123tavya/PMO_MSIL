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

module.exports = {
  initCronJobs,
  processDeadlines
};
