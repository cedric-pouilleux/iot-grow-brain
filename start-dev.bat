@echo off
REM Script batch pour lancer le backend et le frontend dans deux fenêtres PowerShell séparées

echo 🚀 Démarrage des services...
echo.

REM Lancer le script PowerShell
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"

pause

