# Melodexa - WebRTC P2P Startup Script (PowerShell)
# Starts both Flask API and Signaling Server

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Melodexa - WebRTC P2P Architecture" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python
Write-Host "[2/5] Checking Python..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python is not installed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install signaling server dependencies
Write-Host "[3/5] Setting up Signaling Server..." -ForegroundColor Yellow
Set-Location signaling-server
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Node.js dependencies" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start signaling server in new window
Write-Host "Starting Signaling Server..." -ForegroundColor Green
$signalingJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3
Set-Location ..

# Install Python dependencies
Write-Host "[4/5] Setting up Flask API..." -ForegroundColor Yellow
$flaskInstalled = python -c "import flask" 2>$null
if (-not $?) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install Python dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start Flask API in new window
Write-Host "Starting Flask API Server..." -ForegroundColor Green
$flaskJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python run.py" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

# Open browser
Write-Host "[5/5] Opening browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:5000"

Write-Host "" 
Write-Host "============================================" -ForegroundColor Green
Write-Host " Melodexa is running!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host " Signaling Server: ws://localhost:3001" -ForegroundColor White
Write-Host " Flask API:        http://localhost:3000" -ForegroundColor White
Write-Host " Frontend:         http://localhost:5000" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers..." -ForegroundColor Yellow

# Wait for Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $signalingJob.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $flaskJob.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Servers stopped." -ForegroundColor Green
}
