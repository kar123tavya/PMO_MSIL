# Technical Specifications: PMO Dashboard & QA Project Monitoring

## 1. System Overview
The PMO Dashboard is a full-stack, real-time web application tailored for the MSIL QA Vertical. It facilitates the end-to-end monitoring of projects, from ideation to Go-Live, utilizing interactive matrices, dynamic Gantt charts, and health cards.

## 2. Technology Stack
### Frontend
* **Framework:** React 18 (Bootstrapped with Vite)
* **Routing:** React Router v6
* **State Management:** React Context API (`AuthContext`, `ProjectContext`, `NotificationContext`, `ToastContext`)
* **Styling:** Custom vanilla CSS (`index.css`) with responsive CSS Variables, Glassmorphism elements, and CSS Grids.
* **Icons:** Geometric unicode symbols and custom SVG assets.
* **Build Tool:** Vite (ES modules, optimized rollup bundler).

### Backend
* **Runtime:** Node.js v18+
* **Framework:** Express.js
* **Database:** SQLite3 (via `node-sqlite3-wasm`)
  * Configured in **WAL mode** (Write-Ahead Logging) for high concurrency.
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs for password hashing.
* **Real-time Engine:** Server-Sent Events (SSE) native implementation for low-latency broadcasting without WebSocket overhead.
* **Job Scheduler:** `node-cron` for automated tasks.
* **File Processing:** `xlsx` library for robust Excel parsing and buffer generation.

## 3. Architecture & Data Flow
The system follows a monolithic client-server architecture designed for simple intranet deployment.

### 3.1 Server-Sent Events (SSE)
Instead of polling the database, the frontend connects to the `GET /api/events` endpoint. 
When any client updates a project via `PUT /api/projects/:id`, the backend immediately fires `_broadcast('projects_changed', ...)` which pushes the new payload to all active clients via SSE, ensuring 100% synchronization across the QA department instantly.

### 3.2 Database Schema
Located in `server/db/schema.js`, the relational schema contains:
* `users`: Stores RBAC profiles (admin, dpm, sic, tl, pic, viewer).
* `projects`: The core table containing 15+ properties (IL status, theme, division, RAG status).
* `audit_log`: Tracks atomic changes (field-level delta tracking).
* `notifications`: In-app alert queue.
* `history`: Weekly/Monthly statistical snapshots for trend analysis.

## 4. Key Components
* **Dashboard (`Dashboard.jsx`)**: A highly filtered, multi-view matrix supporting dynamic dropdown insertions and global search.
* **Flagship (`Flagship.jsx`)**: Specialized filtered view for critical high-value projects.
* **Gantt Chart (`Gantt.jsx`)**: Automated timeline generator computing visual widths based on start/end dates.
* **Health Card (`HealthCard.jsx`)**: Aggregated statistical view showing RAG (Red, Amber, Green) status and dynamic calculations.
* **PIC Tracker (`PicStaleness.jsx`)**: Algorithmic heatmap that calculates delta-time to surface neglected projects securely mapped to individual PICs.

## 5. Security Protocols
* **RBAC (Role-Based Access Control):** Granular permissions. Only Admins/DPMs can edit users. PICs can only edit projects they are assigned to or have division rights over.
* **Password Security:** Salted and hashed via bcrypt before DB insertion.
* **Token Expiration:** JWT payloads expire securely after 12 hours.

## 6. Deployment Environment
* **Platform:** Windows OS / Local Intranet Server
* **Execution:** Run via `node server.js`
* **Static Assets:** The production React build (`react-app/dist`) is served statically by Express, eliminating the need for a separate frontend server in production.
