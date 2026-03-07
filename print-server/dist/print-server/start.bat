@echo off
chcp 65001 >nul
title Print Server - Giat Say Online
echo ============================================
echo   Print Server - Giat Say Online
echo ============================================
echo.

:: Use bundled Node.js
set "PATH=%~dp0node;%PATH%"

:: Check serviceAccountKey.json
if not exist "%~dp0serviceAccountKey.json" (
    echo.
    echo [LOI] Khong tim thay file serviceAccountKey.json
    echo Vui long dat file serviceAccountKey.json vao thu muc nay.
    echo.
    pause
    exit /b 1
)

echo Dang khoi dong server...
echo Nhan Ctrl+C de dung.
echo.
"%~dp0node\node.exe" "%~dp0server.js"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [LOI] Server dung voi loi
    pause
)
