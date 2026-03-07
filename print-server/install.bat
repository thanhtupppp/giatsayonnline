@echo off
chcp 65001 >nul
echo ====================================
echo   Cài đặt Print Server - Giặt Sấy
echo ====================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không tìm thấy Node.js. Vui lòng cài đặt Node.js trước.
    echo Tải tại: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js: 
node --version

:: Check serviceAccountKey.json
if not exist "..\serviceAccountKey.json" (
    echo.
    echo [LỖI] Không tìm thấy file serviceAccountKey.json!
    echo Vui lòng đặt file serviceAccountKey.json vào thư mục gốc dự án.
    pause
    exit /b 1
)
echo [OK] serviceAccountKey.json tồn tại

:: Install dependencies
echo.
echo Đang cài đặt dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Cài đặt dependencies thất bại!
    pause
    exit /b 1
)

echo.
echo ====================================
echo   Cài đặt hoàn tất!
echo ====================================
echo.
echo Chạy start.bat để khởi động print server.
echo Hoặc chạy: node server.js
echo.
pause
