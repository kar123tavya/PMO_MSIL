# PMO Dashboard — QA Project Monitoring Tool
### Maruti Suzuki Digital & IT Division

A full-stack intranet web application for monitoring IT/QA projects across divisions, with real-time sync, Gantt charts, and role-based access control.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (single file, zero config) |
| Real-time | Server-Sent Events (SSE) |
| Auth | JWT (Role-based) |

---

## Quick Start (First-time setup)

### Prerequisites
- **Node.js 18+** → Download from https://nodejs.org
- No other tools required (no Visual Studio, no databases to install)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_ORG/pmo-dashboard.git
cd pmo-dashboard
```

### 2. Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install React dependencies
cd ../react-app
npm install
cd ..
```

### 3. Build the React frontend
```bash
cd react-app
npm run build
cd ..
```

### 4. Start the server
```bash
cd server
node server.js
```

### 5. Open in browser
```
http://localhost:3000
```

**Default login:** `admin@maruti.co.in` / `admin123`
> Change the admin password immediately after first login.

---

## One-Command Start (Windows)
Double-click `server/start.bat` — it installs dependencies and starts the server automatically.

---

## Project Structure

```
SafaaiLoop/
├── server/                  ← Node.js + Express backend
│   ├── server.js            ← Main server entry point
│   ├── pmo_data.db          ← SQLite database (auto-created)
│   ├── db/schema.js         ← Database schema & seeding
│   ├── middleware/auth.js   ← JWT verification
│   └── routes/              ← API route handlers
│       ├── auth.js          ← Login, register
│       ├── projects.js      ← Project CRUD
│       ├── users.js         ← User management
│       ├── history.js       ← Audit log
│       └── settings.js      ← Custom columns, IL phases
│
├── react-app/               ← React 18 + Vite frontend
│   ├── src/
│   │   ├── pages/           ← Dashboard, Flagship, Gantt, Login
│   │   ├── components/      ← Sidebar, Modal, ProjectForm, etc.
│   │   ├── context/         ← Auth, Project, Toast contexts
│   │   └── api/             ← Axios client, SSE hook
│   └── dist/                ← Production build (after npm run build)
│
└── pmo_dashboard/           ← Legacy HTML frontend (fallback)
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login → returns JWT token |
| POST | `/api/auth/register` | No | Register (pending approval) |
| GET | `/api/projects` | JWT | List all projects |
| POST | `/api/projects` | JWT (SM/SH) | Create project |
| PUT | `/api/projects/:id` | JWT | Update project |
| DELETE | `/api/projects/:id` | JWT (SM) | Delete project |
| GET | `/api/users` | JWT | List users |
| POST | `/api/users` | JWT (SM) | Create/update user |
| GET | `/api/history` | JWT | Audit log |
| GET | `/api/settings/:key` | JWT | Get setting |
| POST | `/api/settings/:key` | JWT (SM) | Update setting |
| GET | `/api/events?token=JWT` | JWT | SSE real-time stream |
| GET | `/api/health` | No | Health check |

---

## Roles & Permissions

| Role | Code | Can Do |
|------|------|--------|
| Senior Manager | `senior_manager` | Everything — full access |
| Section Head | `section_head` | Manage projects in their division |
| Deputy Manager | `deputy_manager` | Update assigned projects |
| Viewer | `viewer` | Read-only + export |

---

## Deployment (MSIL Intranet — Windows Server + IIS)

### Option A: Run directly with Node.js
```bash
cd server
node server.js
```
Access at `http://SERVER_IP:3000`

### Option B: Run as Windows Service (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start the server as a managed process
cd server
pm2 start server.js --name pmo-dashboard

# Auto-start on Windows boot
pm2 save
pm2 startup
```

### Option C: IIS Reverse Proxy
1. Install **iisnode** from https://github.com/Azure/iisnode
2. In IIS, add a new site pointing to the `server/` folder
3. Or configure IIS as a reverse proxy to `http://localhost:3000`

---

## Environment Variables

Create `server/.env` for production:
```env
PORT=3000
JWT_SECRET=your_strong_random_secret_here
```

> ⚠️ **Change `JWT_SECRET`** before deploying to production.

---

## Database Backup

The entire database is a single file: `server/pmo_data.db`

**Backup:** Copy this file to a network share or SharePoint.
**Restore:** Replace the file and restart the server.

---

## Upgrading

```bash
git pull origin main
cd react-app && npm run build && cd ..
# Restart server (or PM2 will auto-restart)
pm2 restart pmo-dashboard
```

---

## Support

For issues, raise a request via the MSIL IT helpdesk or contact the Digital & IT Division.
