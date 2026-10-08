@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Zella Luxe — Fix etiquettes client

echo.
echo === Zella Luxe : correctif impression etiquettes ===
echo A4 marche deja. On remplace seulement le script etiquettes.
echo.

net session >nul 2>&1
if errorlevel 1 (
  echo Relance en Administrateur : clic droit sur ce fichier ^> Executer en tant qu'administrateur
  pause
  exit /b 1
)

set "SRC=%~dp0print-raw.ps1"
if not exist "%SRC%" (
  echo ERREUR : print-raw.ps1 introuvable a cote de ce .cmd
  echo Place APPLY-FIX-ETIQUETTES.cmd et print-raw.ps1 dans le meme dossier.
  pause
  exit /b 1
)

set "FOUND=0"

call :TryCopy "%LOCALAPPDATA%\Programs\Zella Luxe\resources\scripts\print-raw.ps1"
call :TryCopy "%LOCALAPPDATA%\Programs\Zella Luxe\resources\app.asar.unpacked\scripts\print-raw.ps1"
call :TryCopy "%ProgramFiles%\Zella Luxe\resources\scripts\print-raw.ps1"
call :TryCopy "%ProgramFiles(x86)%\Zella Luxe\resources\scripts\print-raw.ps1"
call :TryCopy "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1"
call :TryCopy "C:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1"

for /d %%D in ("%LOCALAPPDATA%\Programs\Zella Luxe*") do (
  call :TryCopy "%%~D\resources\scripts\print-raw.ps1"
)

if "!FOUND!"=="0" (
  echo.
  echo Aucune installation Zella Luxe trouvee.
  echo Installe d'abord Zella-Luxe-Setup-1.0.0.exe puis relance ce fix.
  pause
  exit /b 1
)

echo.
echo OK — script etiquettes mis a jour sur !FOUND! emplacement^(s^).
echo.
echo Etapes suivantes :
echo  1. Ferme puis rouvre Zella Luxe
echo  2. Parametres ^> choisis l'imprimante Xprinter ^(pas PDF^) ^> Enregistrer
echo  3. Reessaie Impression etiquettes
echo.
pause
exit /b 0

:TryCopy
set "DEST=%~1"
if "!DEST!"=="" exit /b 0
for %%I in ("!DEST!") do set "DESTDIR=%%~dpI"
if exist "!DESTDIR!" (
  if exist "!DEST!" copy /Y "!DEST!" "!DEST!.bak" >nul 2>&1
  copy /Y "!SRC!" "!DEST!" >nul 2>&1
  if not errorlevel 1 (
    echo  + Mis a jour : !DEST!
    set /a FOUND+=1
  )
) else if exist "%LOCALAPPDATA%\Programs\Zella Luxe\resources" (
  if /I "!DESTDIR!"=="%LOCALAPPDATA%\Programs\Zella Luxe\resources\scripts\" (
    mkdir "!DESTDIR!" 2>nul
    copy /Y "!SRC!" "!DEST!" >nul 2>&1
    if not errorlevel 1 (
      echo  + Cree : !DEST!
      set /a FOUND+=1
    )
  )
)
exit /b 0
