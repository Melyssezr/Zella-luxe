# Construit Zella-Luxe-Setup-1.0.1.exe avec le correctif étiquettes.
# À lancer sur le PC Windows admin (celui qui a déjà produit Setup 1.0.0).
#
# Usage (PowerShell Admin) depuis le dossier zella-stock :
#   powershell -ExecutionPolicy Bypass -File .\scripts\pack-installer.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host ""
Write-Host "=== Build Zella Luxe 1.0.1 (fix etiquettes) ===" -ForegroundColor Cyan
Write-Host "Dossier: $root"

$printRaw = Join-Path $root "scripts\print-raw.ps1"
if (-not (Test-Path $printRaw)) {
  throw "scripts\print-raw.ps1 manquant — le correctif n'est pas present."
}

# Patch copies locales deja depliees (si rebuild complet echoue)
$patchTargets = @(
  "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1",
  "C:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1"
)
foreach ($dest in $patchTargets) {
  $dir = Split-Path $dest -Parent
  if (Test-Path (Split-Path $dir -Parent)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -Force $printRaw $dest
    Write-Host "  Patched: $dest"
  }
}

if (-not (Test-Path (Join-Path $root "node_modules\electron-builder"))) {
  Write-Host "Installation des dependances npm..."
  npm install
}

Write-Host "Compilation + NSIS Setup..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:client
if ($LASTEXITCODE -ne 0) {
  Write-Host "dist:client a echoue — essai sortie locale release\ ..." -ForegroundColor Yellow
  npm run dist
  if ($LASTEXITCODE -ne 0) { throw "Build NSIS echoue." }
}

$candidates = @(
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.0.1.exe",
  (Join-Path $root "release\Zella-Luxe-Setup-1.0.1.exe"),
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.0.0.exe"
) | Where-Object { Test-Path $_ }

Write-Host ""
if ($candidates.Count -gt 0) {
  Write-Host "OK — Installateur pret :" -ForegroundColor Green
  $candidates | ForEach-Object { Write-Host "  $_" }
  Write-Host ""
  Write-Host "Sur le PC CLIENT :"
  Write-Host "  1. Desinstaller Zella Luxe (Parametres Windows)"
  Write-Host "  2. Installer ce Setup"
  Write-Host "  3. Parametres Zella -> Xprinter -> Enregistrer"
  Write-Host "  4. Tester etiquettes"
} else {
  Write-Host "Build termine mais Setup .exe non trouve. Verifie le dossier release\ ou D:\zella-luxe-release\" -ForegroundColor Yellow
}
