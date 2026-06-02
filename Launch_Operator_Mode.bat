@echo off
title Drilling Twin - Operator Auto-Login Launcher
color 0A
cls

:: ==========================================
:: CONFIGURATION
:: If the server IP changes, edit this line:
SET SERVER_IP=10.1.0.130
SET PORT=8081
:: ==========================================

echo ========================================================
echo         DRILLBIT DIGITAL TWIN - OPERATOR MODE         
echo ========================================================
echo.
echo   Connecting to Drilling Rig Server: http://%SERVER_IP%:%PORT%
echo   Status: Establishing connection...
echo.

:: Check network connectivity to server
ping -n 1 %SERVER_IP% >nul
if %errorlevel% neq 0 (
    color 0C
    echo [WARNING] Server %SERVER_IP% is not responding to ping.
    echo Please make sure this device is connected to the same Wi-Fi/Network.
    echo.
    echo Press any key to try opening the dashboard anyway...
    pause >nul
    color 0A
)

echo   Logging in as Operator automatically...
echo.

:: We launch the special auto-login route
SET URL=http://%SERVER_IP%:%PORT%/operator-autologin

:: Try opening in Google Chrome App Mode (borderless, premium feel, dark background to prevent white flash)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%" --user-data-dir="%LOCALAPPDATA%\DrillbitOperatorProfile" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo
    goto end
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%" --user-data-dir="%LOCALAPPDATA%\DrillbitOperatorProfile" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo
    goto end
)

:: Try opening in Microsoft Edge App Mode (borderless, premium feel, dark background to prevent white flash)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "%URL%" --user-data-dir="%LOCALAPPDATA%\DrillbitOperatorProfile" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo
    goto end
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "%URL%" --user-data-dir="%LOCALAPPDATA%\DrillbitOperatorProfile" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo
    goto end
)

:: Fallback to default system browser
start "" "%URL%"

:end
echo   Dashboard launched successfully!
echo.
timeout /t 3 >nul
