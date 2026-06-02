@echo off
title Drillbit Twin HMI Setup
color 0A
cls

echo ========================================================
echo         DRILLBIT TWIN - HMI STANDALONE SETUP
echo ========================================================
echo.
echo   This script will automatically create a standalone HMI 
echo   App shortcut on your Desktop with the Drillbit logo!
echo.

:: Get the directory where this script is running
set "CURRENT_DIR=%~dp0"
:: Remove trailing backslash
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

:: Configuration
echo Enter the Drilling Rig Server IP address.
echo - If this PC is the server, press Enter to use localhost (127.0.0.1).
echo - If this is a client PC, enter the server's IP address (e.g. 10.1.0.130).
echo.
set "SERVER_IP=10.1.0.130"
set "SERVER_INPUT="
set /p SERVER_INPUT="Server IP [%SERVER_IP%]: "
if defined SERVER_INPUT (
    set "SERVER_INPUT=%SERVER_INPUT: =%"
)
if not "%SERVER_INPUT%"=="" set "SERVER_IP=%SERVER_INPUT%"

set "PORT=8081"
set "URL=http://%SERVER_IP%:%PORT%/operator-autologin"
set "ICON_PATH=%CURRENT_DIR%\DrillbitTwin.ico"

:: Find browser path
set "BROWSER_PATH="
set "ARGUMENTS="

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    set "ARGUMENTS=--kiosk %URL% --user-data-dir=\"%LOCALAPPDATA%\DrillbitOperatorProfile\" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    set "ARGUMENTS=--kiosk %URL% --user-data-dir=\"%LOCALAPPDATA%\DrillbitOperatorProfile\" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
    set "ARGUMENTS=--kiosk %URL% --user-data-dir=\"%LOCALAPPDATA%\DrillbitOperatorProfile\" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    set "ARGUMENTS=--kiosk %URL% --user-data-dir=\"%LOCALAPPDATA%\DrillbitOperatorProfile\" --default-background-color=0f172aff --force-dark-mode --no-first-run --no-default-browser-check --disable-sync --disable-signin-promo"
) else (
    set "BROWSER_PATH=C:\Windows\System32\cmd.exe"
    set "ARGUMENTS=/c start %URL%"
)

echo   1. Using Server IP: %SERVER_IP%
echo   2. Target URL: %URL%
echo   3. Browser found: %BROWSER_PATH%
echo   4. Icon file: %ICON_PATH%
echo.
echo   Creating desktop shortcut...

:: Use PowerShell to create the shortcut file on the Desktop
powershell -NoProfile -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; " ^
    "$DesktopPath = [System.Environment]::GetFolderPath('Desktop'); " ^
    "$Shortcut = $WshShell.CreateShortcut(\"$DesktopPath\Drillbit Operator Dashboard.lnk\"); " ^
    "$Shortcut.TargetPath = '%BROWSER_PATH%'; " ^
    "$Shortcut.Arguments = '%ARGUMENTS%'; " ^
    "if (Test-Path '%ICON_PATH%') { $Shortcut.IconLocation = '%ICON_PATH%'; } " ^
    "$Shortcut.Save();"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! Standalone HMI App created on your Desktop!
    echo   You can now launch the dashboard using the shortcut.
    echo ========================================================
) else (
    color 0C
    echo.
    echo   [ERROR] Failed to create the shortcut. 
    echo   Please make sure you run this script on the HMI PC.
)
echo.
echo Press any key to exit...
pause >nul
