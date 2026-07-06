# PMO Dashboard — Backend Server

## Quick Start (Windows)

1. Install Node.js 20 LTS from https://nodejs.org
2. Double-click `start.bat` — it installs dependencies and starts the server automatically
3. Open your browser to http://localhost:3000
4. Login with: `admin@maruti.co.in` / `admin123`

## Manual Start

```
cd server
npm install
node server.js
```

## Run as Windows Service (Production)

Install PM2:
```
npm install -g pm2
pm2 start server.js --name pmo-dashboard
pm2 save
pm2 startup
```

## IIS Reverse Proxy (Optional)

If hosting behind IIS, install `iisnode` and point it to `server.js`, or use IIS as a reverse proxy to `http://localhost:3000`.

## Default Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@maruti.co.in | admin123 | Senior Manager |

**Change the admin password after first login via the Users panel.**

## Database

The database is stored as `server/pmo_data.db` — a single SQLite file. Back it up by simply copying this file.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `JWT_SECRET` | built-in | Change in production! |
