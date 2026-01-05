@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Habit Tracker - Production Setup
echo ============================================
echo.

:: ==========================================
:: CONFIGURATION
:: ==========================================
set "NODE_DIR=C:\Program Files\nodejs"

:: Check if Node exists at this path
if not exist "%NODE_DIR%\node.exe" (
    echo [ERROR] Node.js not found at: %NODE_DIR%
    echo Please install Node.js in the default location or update this script.
    pause
    exit /b 1
)

echo [INFO] Adding Node.js to PATH...
set "PATH=%NODE_DIR%;%PATH%"

:: Verify node availability
where node >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Could not verify 'node' in PATH even after setting it. Attempting to proceed...
) else (
    echo [INFO] Node.js is ready.
)

:: Check for .env file
if not exist "server\.env" (
    echo [WARNING] server\.env file not found!
    echo Copied .env.example to .env for you. PLEASE CHECK IT.
    copy server\.env.example server\.env
)

:: ==========================================
:: 1. SERVER SETUP
:: ==========================================
echo [1/5] Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)

echo.
echo [2/5] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo [3/5] Pushing schema to database (Supabase)...
call npx prisma db push
if errorlevel 1 (
    echo [ERROR] Failed to push database schema!
    echo check your DATABASE_URL in server/.env
    pause
    exit /b 1
)

cd ..

:: ==========================================
:: 2. CLIENT SETUP
:: ==========================================
echo.
echo [4/5] Installing client dependencies...
cd client
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)
cd ..

:: ==========================================
:: 3. START SERVERS
:: ==========================================
echo.
echo ============================================
echo   Starting Development Servers
echo ============================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.

:: Start Backend
start "Backend Server" cmd /k "set PATH=%NODE_DIR%;%PATH% && cd server && npm run dev"

timeout /t 5 >nul

:: Start Frontend
start "Frontend Server" cmd /k "set PATH=%NODE_DIR%;%PATH% && cd client && npm run dev"

echo Servers are created in new windows.
echo.
echo Press any key to exit this launcher.
pause >nul
