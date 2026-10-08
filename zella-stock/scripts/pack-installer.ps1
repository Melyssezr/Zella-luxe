# Build Zella-Luxe-Setup-1.0.1.exe with the label-print fix.
# Run on the Windows admin PC from the zella-stock folder:
#   powershell -ExecutionPolicy Bypass -File .\scripts\pack-installer.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host ""
Write-Host "=== Build Zella Luxe 1.0.1 (fix etiquettes) ===" -ForegroundColor Cyan
Write-Host "Dossier: $root"

$printRaw = Join-Path $root "scripts\print-raw.ps1"
if (-not (Test-Path $printRaw)) {
  throw "scripts\print-raw.ps1 manquant - le correctif n est pas present."
}

# Patch already-unpacked release trees when a full rebuild is not possible
$patchTargets = @(
  "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1",
  "C:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1",
  (Join-Path $env:LOCALAPPDATA "Programs\Zella Luxe\resources\scripts\print-raw.ps1")
)
foreach ($dest in $patchTargets) {
  $parentOfScripts = Split-Path (Split-Path $dest -Parent) -Parent
  if (Test-Path $parentOfScripts) {
    $dir = Split-Path $dest -Parent
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -Force $printRaw $dest
    Write-Host "  Patched: $dest"
  }
}

if (-not (Test-Path (Join-Path $root "node_modules\electron-builder"))) {
  Write-Host "Installation des dependances npm..."
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install a echoue." }
}

Write-Host "Compilation + NSIS Setup..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

$pkg = Get-Content (Join-Path $root "package.json") -Raw
$hasDistClient = $pkg -match '"dist:client"'
$hasDist = $pkg -match '"dist"'

if ($hasDistClient) {
  npm run dist:client
  if ($LASTEXITCODE -ne 0) {
    Write-Host "dist:client a echoue - essai npm run dist ..." -ForegroundColor Yellow
    if ($hasDist) {
      npm run dist
      if ($LASTEXITCODE -ne 0) { throw "Build NSIS echoue." }
    } else {
      throw "Build NSIS echoue (pas de script dist)."
    }
  }
} elseif ($hasDist) {
  npm run dist
  if ($LASTEXITCODE -ne 0) { throw "Build NSIS echoue." }
} else {
  Write-Host "Pas de script dist dans package.json - patch local uniquement." -ForegroundColor Yellow
  Write-Host "Essaie: npm run build puis electron-builder --win nsis" -ForegroundColor Yellow
}

$candidates = @(
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.0.1.exe",
  (Join-Path $root "release\Zella-Luxe-Setup-1.0.1.exe"),
  (Join-Path $root "dist\Zella-Luxe-Setup-1.0.1.exe"),
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.0.0.exe"
) | Where-Object { Test-Path $_ }

Write-Host ""
if ($candidates.Count -gt 0) {
  Write-Host "OK - Installateur / fichiers trouves :" -ForegroundColor Green
  $candidates | ForEach-Object { Write-Host "  $_" }
  Write-Host ""
  Write-Host "Sur le PC CLIENT :"
  Write-Host "  1. Desinstaller Zella Luxe (Parametres Windows)"
  Write-Host "  2. Installer le Setup"
  Write-Host "  3. Parametres Zella -> Xprinter -> Enregistrer"
  Write-Host "  4. Tester etiquettes"
} else {
  Write-Host "Patch print-raw.ps1 applique si dossiers release presents." -ForegroundColor Yellow
  Write-Host "Setup .exe non trouve. Verifie release\ ou D:\zella-luxe-release\" -ForegroundColor Yellow
  Write-Host "Sinon utilise: scripts\APPLY-FIX-ETIQUETTES.cmd (admin) sur le client." -ForegroundColor Yellow
}
