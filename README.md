# PMO Dashboard — Deployment Guide & Requirements
## Maruti Suzuki India Limited | QA Division

---

## 1. SYSTEM REQUIREMENTS

### Minimum Hardware
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM       | 2 GB    | 4 GB        |
| Storage   | 500 MB  | 1 GB        |
| CPU       | 1 Core  | 2+ Cores    |

### Software Prerequisites (Must Install First)

#### ✅ Node.js (v18 or higher — REQUIRED)
- Download: https://nodejs.org/en/download/
- Recommended: LTS version (v20.x or v22.x)
- Verify install: `node --version` (should show v18+)
- npm is included with Node.js automatically

#### ✅ Git (for cloning from GitHub)
- Download: https://git-scm.com/download/win
- Only needed if cloning from GitHub

---

## 2. PROJECT STRUCTURE

```
SafaaiLoop/
├── package.json               ← Root scripts (install:all, deploy)
├── README.md                  ← This file
├── PMO_Master.xlsx            ← Excel master file (auto-synced)
├── Sample_Template.xlsx       ← Import template for bulk upload
│
├── server/                    ← Node.js Backend (Express + SQLite)
│   ├── server.js              ← Main server entry point (port 3000)
│   ├── package.json           ← Backend dependencies
│   ├── .env                   ← Environment variables (API keys)
│   ├── start.bat              ← One-click Windows start script
│   ├── pmo_data.db            ← SQLite database (all data stored here)
│   ├── db/
│   │   └── schema.js          ← DB schema + seed data
│   ├── middleware/
│   │   └── auth.js            ← JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            ← Login/logout endpoints
│   │   ├── projects.js        ← Project CRUD endpoints
│   │   ├── users.js           ← User management endpoints
│   │   ├── settings.js        ← Custom columns + IL phases
│   │   ├── import-export.js   ← Excel import/export + DB sync
│   │   ├── notifications.js   ← Notification endpoints
│   │   ├── audit.js           ← Audit log endpoints
│   │   ├── history.js         ← Project history endpoints
│   │   └── ai.js              ← AI chatbot (Grok API) endpoint
│   └── services/
│       ├── excelSyncService.js ← Auto-sync DB → Excel every 60s
│       └── cronService.js      ← Deadline email alerts (daily cron)
│
└── react-app/                 ← React Frontend (Vite)
    ├── package.json           ← Frontend dependencies
    ├── vite.config.js         ← Vite config (proxy to :3000)
    ├── index.html             ← HTML entry point
    ├── dist/                  ← Production build (served by server)
    └── src/
        ├── App.jsx            ← Root React component + routing
        ├── main.jsx           ← React entry point
        ├── index.css          ← Global styles
        ├── api/
        │   └── client.js      ← Axios instance with auth headers
        ├── context/
        │   ├── AuthContext.jsx    ← Login state + JWT
        │   ├── ProjectContext.jsx ← Projects + SSE listener
        │   └── ToastContext.jsx   ← Toast notification system
        ├── components/
        │   ├── Sidebar.jsx        ← Navigation sidebar
        │   ├── Header.jsx         ← Top bar with search + bell
        │   ├── ProjectForm.jsx    ← Add/edit project modal
        │   ├── AppTutorial.jsx    ← Interactive walkthrough (Joyride)
        │   ├── AIChatWidget.jsx   ← AI chat bubble (Grok)
        │   ├── ColumnManager.jsx  ← Custom column add/manage
        │   ├── ApprovalModal.jsx  ← Send for approval UI
        │   ├── ImportModal.jsx    ← Excel bulk import modal
        │   ├── KPICard.jsx        ← Dashboard KPI widget
        │   ├── StatusPill.jsx     ← Colored status badge
        │   └── RoleBadge.jsx      ← User role badge
        └── pages/
            ├── Login.jsx          ← Login screen
            ├── Dashboard.jsx      ← Main project table view
            ├── Flagship.jsx       ← Flagship projects tracker
            ├── Gantt.jsx          ← Gantt chart timeline
            ├── AuditLog.jsx       ← Full audit trail
            └── Settings.jsx       ← Admin settings panel
```

---

## 3. BACKEND DEPENDENCIES (server/package.json)

| Package             | Version  | Purpose                                    |
|---------------------|----------|--------------------------------------------|
| express             | ^4.19.2  | Web server framework                       |
| bcryptjs            | ^2.4.3   | Password hashing                           |
| jsonwebtoken        | ^9.0.2   | JWT auth tokens                            |
| cors                | ^2.8.5   | Cross-origin resource sharing              |
| dotenv              | ^17.4.2  | Load .env environment variables            |
| multer              | ^2.2.0   | File upload handling (Excel import)        |
| node-sqlite3-wasm   | ^0.8.7   | SQLite database (no native bindings)       |
| xlsx                | ^0.18.5  | Excel read/write (import + export)         |
| uuid                | ^9.0.1   | Generate unique IDs                        |
| node-cron           | ^4.6.0   | Scheduled deadline email alerts            |
| nodemailer          | ^9.0.3   | Send email notifications                   |

---

## 4. FRONTEND DEPENDENCIES (react-app/package.json)

| Package             | Version  | Purpose                                    |
|---------------------|----------|--------------------------------------------|
| react               | ^19.2.7  | UI framework                               |
| react-dom           | ^19.2.7  | React DOM renderer                         |
| react-router-dom    | ^6.30.4  | Client-side routing                        |
| axios               | ^1.18.1  | HTTP client (API calls)                    |
| react-joyride       | ^3.2.0   | Interactive guided tutorial                |
| html2canvas         | ^1.4.1   | Screenshot/export to PNG                   |

### Dev Dependencies (only needed to rebuild frontend)
| Package             | Version  | Purpose                                    |
|---------------------|----------|--------------------------------------------|
| vite                | ^8.1.1   | Build tool + dev server                    |
| @vitejs/plugin-react| ^6.0.3   | React plugin for Vite                      |
| @types/react        | ^19.2.17 | TypeScript types (for IDE hints)           |
| oxlint              | ^1.71.0  | Linter                                     |

---

## 5. ENVIRONMENT VARIABLES (server/.env)

```
GROK_API_KEY=your_grok_api_key_here
PORT=3000   (optional, defaults to 3000)
JWT_SECRET=your_jwt_secret_here  (optional, has default)
```

> ⚠️ The `.env` file contains the AI API key. Do NOT share this file publicly.

---

## 6. SETUP INSTRUCTIONS (Fresh Installation)

### Step 1: Clone or Copy the Project
**Option A — From GitHub:**
```bash
git clone https://github.com/kar123tavya/PMO_MSIL.git
cd PMO_MSIL
```
**Option B — From ZIP:**
- Extract `PMO_Dashboard.zip` to a folder (e.g., `C:\PMO_Dashboard\`)
- Open that folder in a terminal

### Step 2: Install All Dependencies
Open a terminal (Command Prompt or PowerShell) in the project root folder:
```bash
npm run install:all
```
This single command installs both backend AND frontend dependencies.

Alternatively, install manually:
```bash
# Install backend
cd server
npm install
cd ..

# Install frontend
cd react-app
npm install
cd ..
```

### Step 3: Build the Frontend
```bash
cd react-app
npm run build
cd ..
```
This creates `react-app/dist/` which is served by the backend.

### Step 4: Start the Server
**Option A — Using batch file (Windows, easiest):**
```
Double-click: server/start.bat
```

**Option B — Using npm:**
```bash
cd server
node server.js
```

**Option C — From project root:**
```bash
npm start
```

### Step 5: Open in Browser
```
http://localhost:3000
```

---

## 7. DEFAULT LOGINS

| Role          | Email                    | Password  |
|---------------|--------------------------|-----------|
| Administrator | admin@maruti.co.in       | admin123  |
| PIC (User)    | kartavya1@maruti.co.in   | pass123   |

> ⚠️ Change these passwords immediately in a production environment!

---

## 8. FEATURES & WHAT EACH DOES

| Feature               | Description                                                              |
|-----------------------|--------------------------------------------------------------------------|
| Dashboard             | Master project table with filters, KPI cards, search                     |
| Flagship View         | IL lifecycle tracker for flagship projects (table with phases)            |
| Gantt Chart           | Visual timeline of all projects with IL bars (4yr window, today line)    |
| Audit Log             | Full history of all changes made to projects                             |
| Import / Export       | Bulk upload projects via Excel; export filtered view to Excel            |
| Custom Columns        | Add extra columns to dashboard/flagship/gantt (admin = instant, PIC = pending) |
| Approval Workflow     | PIC edits go to admin for approval; admin edits are instant              |
| Notifications         | Bell icon shows all pending approvals and system alerts                  |
| AI Chat               | Grok-powered AI assistant for project queries                            |
| Interactive Tutorial  | Guided walkthrough of the app with close button at any step              |
| Excel Auto-Sync       | PMO_Master.xlsx auto-syncs with DB every 60 seconds                      |
| Email Alerts          | Daily cron job sends email reminders for upcoming project deadlines      |
| Role-Based Access     | admin / section_head / senior_manager / pic roles with different permissions |

---

## 9. USER ROLES & PERMISSIONS

| Action                         | admin | section_head | senior_manager | pic    |
|-------------------------------|-------|--------------|----------------|--------|
| View all projects              | ✅    | ✅           | ✅             | ✅     |
| Add/Edit project (own div)     | ✅    | ✅           | ✅             | ✅     |
| Edit cross-division project    | ✅    | ✅           | ✅             | ⚠️ (needs reason) |
| Delete project                 | ✅    | ✅           | ✅             | ❌     |
| Approve project edits          | ✅    | ✅           | ✅             | ❌     |
| Add column (instant)           | ✅    | ✅           | ✅             | ❌     |
| Add column (needs approval)    | ❌    | ❌           | ❌             | ✅     |
| Manage users                   | ✅    | ❌           | ❌             | ❌     |
| Import Excel data              | ✅    | ✅           | ✅             | ❌     |
| Trigger email alerts           | ✅    | ❌           | ❌             | ❌     |

---

## 10. NETWORK ACCESS (LAN Sharing)

To let other users on the same network access the dashboard:
1. Start the server (it binds to `0.0.0.0` — all interfaces)
2. Find your PC's local IP: Run `ipconfig` → look for IPv4 Address (e.g., `192.168.1.100`)
3. Share the URL: `http://192.168.1.100:3000`
4. Other users on the same WiFi/LAN can open this URL in their browser

> No other software (IIS, nginx, Apache) is needed for LAN use.

---

## 11. TROUBLESHOOTING

| Problem                         | Solution                                                     |
|---------------------------------|--------------------------------------------------------------|
| `node` not found                | Install Node.js from nodejs.org and restart terminal         |
| Port 3000 already in use        | Change `PORT=3001` in `server/.env`                         |
| White/blank page                | Run `npm run build` in react-app first, then restart server  |
| Login fails                     | Server may not be running; check terminal for errors         |
| Excel import not working        | Ensure file follows Sample_Template.xlsx column headers      |
| AI chat says API error          | Check GROK_API_KEY in server/.env                           |
| DB lock error on startup        | Delete `server/pmo_data.db.lock` folder and restart          |

---

## 12. GITHUB REPOSITORY

Repository: https://github.com/kar123tavya/PMO_MSIL
Branch: master

To pull latest updates:
```bash
git pull origin master
cd react-app && npm run build
# Restart server
```

---

*Generated: July 2026 | PMO Dashboard v1.0 | MSIL QA Division*
