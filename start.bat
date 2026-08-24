@echo off
chcp 65001 >nul
title Travectory - 路书规划
echo ================================
echo   Travectory 路书规划
echo ================================
echo.
cd /d "%~dp0"

:: Check if built
if not exist ".next" (
    echo [首次运行] 正在构建生产版本...
    call npm run build
    echo.
)

echo 正在启动服务器...
echo 打开浏览器访问: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

start "" http://localhost:3000
npm start
pause
