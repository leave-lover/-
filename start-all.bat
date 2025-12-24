@echo off
title Energy Defense Platform - Start All Services
echo ========================================
echo Energy Defense Platform
echo Starting Frontend and Backend Services
echo ========================================

:: 启动前端服务
echo Starting Frontend Service...
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm run dev"

:: 等待几秒让前端服务启动
timeout /t 3 /nobreak >nul

:: 启动后端服务
echo Starting Backend Service...
cd /d "%~dp0backend"
start "Backend" cmd /k "python app.py"

echo.
echo Services started successfully!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
echo.
echo Press any key to exit...
pause >nul