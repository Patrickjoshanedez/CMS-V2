@echo off
:: Self-elevation to Run as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges to compact Docker virtual disk...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================================
echo       CMS-V2 Docker Disk Compactor (Freeing 70+ GB)
echo ================================================================
echo.
echo 1. Shutting down Docker WSL2 engine...
wsl --shutdown

set VHDX_PATH=%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx
if not exist "%VHDX_PATH%" (
    set VHDX_PATH=%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx
)

if not exist "%VHDX_PATH%" (
    echo Error: Could not locate Docker VHDX file.
    pause
    exit /b 1
)

echo.
echo 2. Found Docker Virtual Disk:
echo    %VHDX_PATH%
echo.
echo 3. Compacting disk (this may take 1-2 minutes)...

(
echo select vdisk file="%VHDX_PATH%"
echo attach vdisk readonly
echo compact vdisk
echo detach vdisk
) > "%TEMP%\compact_docker_diskpart.txt"

diskpart /s "%TEMP%\compact_docker_diskpart.txt"
del "%TEMP%\compact_docker_diskpart.txt"

echo.
echo ================================================================
echo [SUCCESS] Docker virtual disk compacted! Space reclaimed.
echo ================================================================
echo.
pause
