@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   Build Print Server - Portable Distribution
echo ============================================
echo.

:: Configuration
set "NODE_VERSION=20.18.1"
set "NODE_ARCH=win-x64"
set "NODE_ZIP=node-v%NODE_VERSION%-%NODE_ARCH%.zip"
set "NODE_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_ZIP%"
set "DIST_DIR=dist\print-server"
set "OUTPUT_ZIP=dist\print-server-portable.zip"

:: Step 1: Clean previous build
echo [1/7] Dọn dẹp bản build cũ...
if exist dist rmdir /s /q dist
mkdir "%DIST_DIR%"

:: Step 2: Bundle + Obfuscate source code
echo [2/7] Bundle + Obfuscate mã nguồn (bảo vệ code)...
node build.js
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Bundle/Obfuscate thất bại!
    pause
    exit /b 1
)
echo      [OK] Mã nguồn đã được bảo vệ

:: Step 3: Download Node.js portable
echo [3/7] Tải Node.js v%NODE_VERSION% portable...
if not exist "temp" mkdir temp
if not exist "temp\%NODE_ZIP%" (
    echo      Đang tải từ %NODE_URL% ...
    curl -L -o "temp\%NODE_ZIP%" "%NODE_URL%"
    if %ERRORLEVEL% neq 0 (
        echo [LỖI] Không tải được Node.js!
        pause
        exit /b 1
    )
)
echo      [OK] Đã có Node.js portable

:: Step 4: Extract Node.js (only node.exe)
echo [4/7] Giải nén Node.js...
powershell -Command "Expand-Archive -Path 'temp\%NODE_ZIP%' -DestinationPath 'temp\node_extract' -Force"
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không giải nén được Node.js!
    pause
    exit /b 1
)
mkdir "%DIST_DIR%\node"
copy "temp\node_extract\node-v%NODE_VERSION%-%NODE_ARCH%\node.exe" "%DIST_DIR%\node\node.exe" >nul
echo      [OK] Node.js đã sẵn sàng

:: Step 5: Copy OBFUSCATED server + necessary files only
echo [5/7] Copy file dự án (đã mã hóa)...
:: Copy the obfuscated bundle as server.js (so start.bat works)
copy "build\server.bundle.js" "%DIST_DIR%\server.js" >nul
:: Copy fonts (needed for PDF generation), .env config
xcopy "fonts" "%DIST_DIR%\fonts\" /s /e /q >nul
copy ".env.example" "%DIST_DIR%\.env" >nul
:: Copy package.json for production dependency install
copy "package.json" "%DIST_DIR%\" >nul
copy "package-lock.json" "%DIST_DIR%\" >nul 2>nul
echo      [OK] Đã copy xong (mã nguồn đã bảo vệ)

:: Step 6: Install production dependencies using bundled node
echo [6/7] Cài đặt dependencies (npm install --production)...
:: We need npm to install, so temporarily add npm
xcopy "temp\node_extract\node-v%NODE_VERSION%-%NODE_ARCH%\node_modules" "%DIST_DIR%\node\node_modules\" /s /e /q >nul 2>nul
copy "temp\node_extract\node-v%NODE_VERSION%-%NODE_ARCH%\npm.cmd" "%DIST_DIR%\node\" >nul 2>nul
pushd "%DIST_DIR%"
"node\node.exe" "node\node_modules\npm\bin\npm-cli.js" install --production --ignore-scripts 2>nul
if %ERRORLEVEL% neq 0 (
    echo      Thử cài lại với npm hệ thống...
    call npm install --production
)
popd
:: Remove npm from the distribution (not needed at runtime, saves ~15MB)
rmdir /s /q "%DIST_DIR%\node\node_modules" 2>nul
del "%DIST_DIR%\node\npm.cmd" 2>nul
:: Remove dev-only files from dist
del "%DIST_DIR%\package.json" 2>nul
del "%DIST_DIR%\package-lock.json" 2>nul
echo      [OK] Dependencies đã cài xong

:: Step 7: Create the launcher scripts + docs inside dist
echo [7/7] Tạo file khởi động...

:: Create start.bat inside dist
(
echo @echo off
echo chcp 65001 ^>nul
echo title Print Server - Giat Say Online
echo echo ============================================
echo echo   Print Server - Giat Say Online
echo echo ============================================
echo echo.
echo.
echo :: Use bundled Node.js
echo set "PATH=%%~dp0node;%%PATH%%"
echo.
echo :: Check serviceAccountKey.json
echo if not exist "%%~dp0serviceAccountKey.json" ^(
echo     echo.
echo     echo [LOI] Khong tim thay file serviceAccountKey.json!
echo     echo Vui long dat file serviceAccountKey.json vao thu muc nay.
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo Dang khoi dong server...
echo echo Nhan Ctrl+C de dung.
echo echo.
echo "%%~dp0node\node.exe" "%%~dp0server.js"
echo if %%ERRORLEVEL%% neq 0 ^(
echo     echo.
echo     echo [LOI] Server dung voi loi!
echo     pause
echo ^)
) > "%DIST_DIR%\start.bat"

:: Create README
(
echo ============================================
echo   HUONG DAN CAI DAT PRINT SERVER
echo ============================================
echo.
echo 1. Chep file "serviceAccountKey.json" vao thu muc nay
echo    ^(cung cap tu Firebase Console ^> Service Account^)
echo.
echo 2. Chinh sua file ".env" de cau hinh:
echo    - MA_CUA_HANG: Ma cua hang ^(de trong neu muon chon khi chay^)
echo    - INTERACTIVE_STORE_SELECT=true: Chon cua hang tren man hinh
echo    - PRINTER_NAME: Ten may in ^(de trong = may in mac dinh^)
echo    - PAPER_SIZE_MM: Kho giay ^(mac dinh: 80mm^)
echo.
echo 3. Nhan doi chuot vao "start.bat" de chay
echo.
echo LUU Y:
echo    - Khong can cai dat Node.js - da co san trong thu muc "node\"
echo    - Khong can cai bat ky phan mem nao khac
echo    - May tinh can co ket noi Internet de ket noi Firebase
echo.
) > "%DIST_DIR%\HUONG-DAN.txt"

:: Create ZIP
echo.
echo Đang nén thành file ZIP...
powershell -Command "Compress-Archive -Path 'dist\print-server' -DestinationPath '%OUTPUT_ZIP%' -Force"
if %ERRORLEVEL% neq 0 (
    echo [LỖI] Không nén được ZIP!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   BUILD HOÀN TẤT! (Mã nguồn đã bảo vệ)
echo ============================================
echo.
echo File output: %OUTPUT_ZIP%
for %%I in (%OUTPUT_ZIP%) do echo Dung lượng: %%~zI bytes
echo.
echo Khách hàng CHỈ thấy:
echo   - server.js (đã mã hóa, không đọc được)
echo   - node/ (Node.js runtime)
echo   - node_modules/ (dependencies)
echo   - fonts/ (font chữ)
echo   - .env (cấu hình)
echo   - start.bat (khởi động)
echo   - HUONG-DAN.txt
echo.
echo KHÔNG chứa: source code gốc, build.js, package.json
echo.
pause
