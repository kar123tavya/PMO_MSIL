@echo off
TITLE PMO Dashboard Server
COLOR 0A

echo ===================================================
echo     Starting PMO Dashboard... Please wait.
echo ===================================================
echo.

:: Automatically navigate to the server folder where this script is located
cd /d "%~dp0\server"

:: Wait 2 seconds, then open the user's default web browser
timeout /t 2 /nobreak > NUL
start http://localhost:3000

:: Start the Node.js server
node server.js

pause
