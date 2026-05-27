@echo off
title P0020-Data-Box Dev
cd /d "%~dp0"

echo.
echo  P0020-Data-Box - dev.bat
echo  - UI : http://127.0.0.1:5177
echo.

echo Khoi dong P0020-Data-Box...
start "" "http://127.0.0.1:5177"

echo.
echo  Giu cua so nay mo. Ctrl+C de dung Vite.
echo.

corepack pnpm dev
