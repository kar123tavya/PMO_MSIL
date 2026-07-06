// ═══════════════════════════════════════════════════════
//  server.js — PMO Dashboard Express Server
//              Node.js + Express + SQLite + SSE
//              MSIL Intranet Deployment
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { db }  = require('./db/schema');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ──────────────────────────────────────────────────────
   Server-Sent Events (SSE) — Real-time broadcast
────────────────────────────────────────────────────── */
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (_) { sseClients.delete(client); }
  }
}

// SSE endpoint — browsers connect here for real-time updates
const { authMiddleware } = require('./middleware/auth');
app.get('/api/events', authMiddleware, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
  res.flushHeaders();

  // Send a heartbeat immediately so client knows it's connected
  res.write(`event: connected\ndata: {"status":"ok"}\n\n`);

  sseClients.add(res);

  // Heartbeat every 10s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) { clearInterval(heartbeat); sseClients.delete(res); }
  }, 10000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

/* ── Wire up routes with broadcast ── */
const authRoutes          = require('./routes/auth');
const projectRoutes       = require('./routes/projects');
const userRoutes          = require('./routes/users');
const historyRoutes       = require('./routes/history');
const settingsRoutes      = require('./routes/settings');
const importExportRoutes  = require('./routes/import-export');
const notificationRoutes  = require('./routes/notifications');
const auditRoutes         = require('./routes/audit');

const { initExcelSync }   = require('./services/excelSyncService');

projectRoutes.setBroadcast(broadcast);
userRoutes.setBroadcast(broadcast);
settingsRoutes.setBroadcast(broadcast);
importExportRoutes.setBroadcast(broadcast);
notificationRoutes.setBroadcast(broadcast);

app.use('/api/auth',          authRoutes);
app.use('/api/projects',      importExportRoutes.router);
app.use('/api/projects',      projectRoutes.router);
app.use('/api/users',         userRoutes.router);
app.use('/api/history',       historyRoutes);
app.use('/api/settings',      settingsRoutes.router);
app.use('/api/notifications', notificationRoutes.router);
app.use('/api/audit',         auditRoutes);

/* ── Serve frontend static files ── */
// In production: serve React build from react-app/dist/
// In dev: the React app runs on Vite (npm run dev in react-app/)
const REACT_DIST = path.join(__dirname, '..', 'react-app', 'dist');
const LEGACY_FRONTEND = path.join(__dirname, '..', 'pmo_dashboard');

if (require('fs').existsSync(REACT_DIST)) {
  // Production: serve the React build
  app.use(express.static(REACT_DIST));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(REACT_DIST, 'index.html'));
  });
} else {
  // Fallback: serve legacy HTML frontend
  app.use(express.static(LEGACY_FRONTEND));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(LEGACY_FRONTEND, 'index.html'));
  });
}

/* ── Health check ── */
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

/* ── Start ── */
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`  PMO Dashboard Server running on port ${PORT}`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Default login: admin@maruti.co.in / admin123`);
  console.log('═══════════════════════════════════════════════');
  
  // Start Background Excel Sync
  const masterFilePath = path.join(__dirname, '..', 'PMO_Master.xlsx');
  initExcelSync(db, masterFilePath, (evt, payload) => {
    // Send SSE event
    broadcast(evt, payload);
  });
  
  // Start automated email deadline alerts
  const { initCronJobs } = require('./services/cronService');
  initCronJobs();
});
