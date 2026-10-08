@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Zella Luxe — trouver le projet et build Setup 1.0.1

echo.
echo Recherche de pack-installer.ps1 / zella-stock ...
echo.

set "FOUND="
for %%D in (
  "C:\Users\hp\Projects\zella-luxe\zella-stock"
  "C:\Users\hp\Projects\Zella-luxe\zella-stock"
  "D:\zella-luxe\zella-stock"
  "D:\Projects\zella-luxe\zella-stock"
) do (
  if exist "%%~D\scripts\pack-installer.ps1" (
    set "FOUND=%%~D"
    goto :run
  )
)

echo Pas trouve aux emplacements habituels.
echo Lance cette recherche dans PowerShell :
echo   Get-ChildItem C:\Users,D:\ -Filter pack-installer.ps1 -Recurse -ErrorAction SilentlyContinue
echo.
pause
exit /b 1

:run
echo Trouve : %FOUND%
echo.
cd /d "%FOUND%"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\pack-installer.ps1"
echo.
pause
exit /b %ERRORLEVEL%
