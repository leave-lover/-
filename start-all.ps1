# Energy Defense Platform - Start All Services
Write-Host "========================================" -ForegroundColor Green
Write-Host "Energy Defense Platform" -ForegroundColor Green
Write-Host "Starting Frontend and Backend Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 启动前端服务
Write-Host "Starting Frontend Service..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d ""$(Get-Location)\frontend"" && npm run dev"

# 等待几秒让前端服务启动
Start-Sleep -Seconds 3

# 启动后端服务
Write-Host "Starting Backend Service..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "cd /d ""$(Get-Location)\backend"" && python app.py"

Write-Host ""
Write-Host "Services started successfully!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host