# Telecharge le correctif etiquettes depuis GitHub dans le projet local,
# puis patch les dossiers release / installation.
# A coller ou lancer depuis : C:\Users\hp\Projects\zella-luxe\zella-stock

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = "C:\Users\hp\Projects\zella-luxe\zella-stock"
if (-not (Test-Path $root)) {
  $root = (Get-Location).Path
}
Set-Location $root

$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock/scripts"
$scriptsDir = Join-Path $root "scripts"
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null

$files = @(
  "print-raw.ps1",
  "pack-installer.ps1",
  "APPLY-FIX-ETIQUETTES.cmd",
  "TEST-ETIQUETTE.cmd",
  "test-label.ps1",
  "TROUVER-ET-BUILD.cmd"
)

Write-Host "Telechargement depuis GitHub ($branch) ..." -ForegroundColor Cyan
foreach ($name in $files) {
  $url = "$base/$name"
  $dest = Join-Path $scriptsDir $name
  Write-Host "  $name"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

$printRaw = Join-Path $scriptsDir "print-raw.ps1"
if (-not (Test-Path $printRaw)) { throw "print-raw.ps1 manquant apres telechargement." }

$targets = @(
  (Join-Path $root "scripts\print-raw.ps1"),
  "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1",
  "$env:LOCALAPPDATA\Programs\Zella Luxe\resources\scripts\print-raw.ps1"
)

Write-Host ""
Write-Host "Patch des copies locales ..." -ForegroundColor Cyan
foreach ($dest in $targets) {
  $dir = Split-Path $dest -Parent
  if (Test-Path (Split-Path $dir -Parent) -or $dest -like "*\zella-stock\scripts\*") {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -Force $printRaw $dest
    Write-Host "  OK $dest" -ForegroundColor Green
  } else {
    Write-Host "  skip (dossier parent absent) $dest" -ForegroundColor DarkGray
  }
}

Write-Host ""
Write-Host "Fichiers prets dans: $scriptsDir" -ForegroundColor Green
Write-Host ""
Write-Host "Ensuite, pour rebuild le Setup 1.0.1 :"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\pack-installer.ps1"
Write-Host ""
Write-Host "Ou sans rebuild, sur le PC client :"
Write-Host "  clic droit scripts\APPLY-FIX-ETIQUETTES.cmd -> Executer en admin"
