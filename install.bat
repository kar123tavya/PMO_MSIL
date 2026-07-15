@echo off
echo ==============================================
echo Installing PMO Tool Dependencies...
echo ==============================================

REM Set the Node.js path automatically based on the location you provided
set PATH=C:\Users\590312\Downloads\node-v22.17.0-win-x64\node-v22.17.0-win-x64;%PATH%

echo.
echo Installing Backend Dependencies...
cd server
call npm install
cd ..

echo.
echo Installing Frontend Dependencies...
cd react-app
call npm install
cd ..

echo.
echo ==============================================
echo Installation Complete! You can now close this window.
echo ==============================================
pause
