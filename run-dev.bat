@echo off
title HireVerse Dev Server
echo ===================================================
echo            HireVerse Auto Setup ^& Run
echo ===================================================
echo.

echo [1/4] Stopping any hanging Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo [2/4] Installing dependencies (npm install --legacy-peer-deps)...
call npm install --legacy-peer-deps
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] npm install failed.
    echo If files are locked, please close VS Code and retry.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Generating Prisma Client ^& Syncing Database...
call npx prisma generate
call npx prisma db push

echo.
echo ===================================================
echo [4/4] Starting Next.js Dev Server on http://localhost:3000 ...
echo ===================================================
echo.
call npm run dev
pause
