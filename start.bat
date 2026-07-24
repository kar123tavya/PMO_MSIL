@echo off
echo ==============================================
echo Starting PMO Tool...
echo ==============================================

REM Set the Node.js path automatically based on the location you provided
set PATH=C:\Users\590312\Downloads\node-v22.17.0-win-x64\node-v22.17.0-win-x64;%PATH%

echo Starting Backend Server...
cd server
start cmd /k "npm run dev"
cd ..

echo Starting Frontend Server...
cd react-app
start cmd /k "npm run dev -- --host"
cd ..

echo.
echo Both servers have been started in new windows!
echo You can now check your IP address using the 'ipconfig' command.
pause
