@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Zella Luxe — Test etiquette Xprinter

echo.
echo === Test brut etiquette (sans ouvrir Zella) ===
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-label.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
  echo ECHEC du test. Verifie Generic / Text Only + USB + Parametres Zella.
) else (
  echo Si une etiquette "ZELLA TEST" est sortie, le chemin etiquettes est OK.
)
pause
exit /b %ERR%
