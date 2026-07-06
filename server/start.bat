@echo off
echo ===============================================
echo  PMO Dashboard Server — Starting...
echo ===============================================
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo.
echo Server starting at http://localhost:3000
echo Open your browser to http://localhost:3000
echo Press Ctrl+C to stop.
echo.
node server.js
pause
