@echo off
REM Melodexa - WebRTC P2P Startup Script
REM Starts both Flask API and Signaling Server

echo ============================================
echo  Melodexa - WebRTC P2P Architecture
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed!
    pause
    exit /b 1
)

echo [1/5] Checking signaling server dependencies...
cd signaling-server
if not exist node_modules (
    echo Installing Node.js dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

echo [2/5] Checking Python dependencies...
cd ..
pip show Flask >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install Python dependencies
        pause
        exit /b 1
    )
)

echo [3/5] Starting Signaling Server (Node.js)...
cd signaling-server
start "Melodexa Signaling Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
cd ..

echo [4/5] Starting Flask API Server...
start "Melodexa Flask API" cmd /k "python run.py"
timeout /t 3 /nobreak >nul

echo [5/5] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5000

echo.
echo ============================================
echo  Melodexa is running!
echo ============================================
echo  Signaling Server: ws://localhost:3001
echo  Flask API:        http://localhost:3000
echo  Frontend:         http://localhost:5000
echo ============================================
echo.
echo Press any key to stop all servers...
pause >nul

echo.
echo Stopping servers...
taskkill /FI "WindowTitle eq Melodexa*" /T /F >nul 2>nul
echo Servers stopped.
pause
