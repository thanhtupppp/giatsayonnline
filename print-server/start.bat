@echo off
chcp 65001 >nul
title Print Server - Giặt Sấy Online
echo ====================================
echo   Print Server - Giặt Sấy Online
echo ====================================
echo.
echo Đang khởi động server...
echo Nhấn Ctrl+C để dừng.
echo.
node server.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LỖI] Server dừng với lỗi!
    pause
)
