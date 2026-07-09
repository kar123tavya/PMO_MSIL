@echo off
title PMO Dashboard — Setup & Launch
echo ================================================================
echo   PMO Dashboard — Maruti Suzuki India Limited (MSIL)
echo   QA Division Project Monitoring Tool
echo ================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo Please download and install Node.js first:
    echo   https://nodejs.org/en/download/
    echo   Choose the LTS version.
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

REM Show Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js found: %NODE_VER%
echo.

cd /d "%~dp0"

REM Install server dependencies
echo [1/3] Installing backend dependencies (server/)...
cd server
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install server dependencies. Check internet connection.
        pause
        exit /b 1
    )
) else (
    echo       Already installed. Skipping.
)
cd ..

REM Install + build frontend
echo.
echo [2/3] Installing frontend dependencies (react-app/)...
cd react-app
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
) else (
    echo       Already installed. Skipping.
)

echo.
echo [3/3] Building React frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed. Check for errors above.
    pause
    exit /b 1
)
cd ..

echo.
echo ================================================================
echo   Setup complete! Starting the server...
echo ================================================================
echo.
echo   Open your browser to:  http://localhost:3000
echo.
echo   Default credentials:
echo     Admin:   admin@maruti.co.in     / admin123
echo     User:    kartavya1@maruti.co.in / pass123
echo.
echo   Press Ctrl+C to stop the server.
echo ================================================================
echo.

cd server
node server.js
pause
