# Fix BOM UTF-8 (casse Vite/PostCSS) puis rebuild Setup 1.1.0
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-bom-and-build-1.1.ps1

$ErrorActionPreference = "Stop"
$root = "C:\Users\hp\Projects\zella-luxe\zella-stock"
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }
Set-Location $root
Write-Host "Projet: $root" -ForegroundColor Cyan

function Remove-Utf8Bom([string]$path) {
  if (-not (Test-Path $path)) { return }
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $noBom = $bytes[3..($bytes.Length - 1)]
    [IO.File]::WriteAllBytes($path, $noBom)
    Write-Host "  BOM retire: $path" -ForegroundColor Green
  }
}

function Write-Utf8NoBom([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $text, $enc)
}

Write-Host "1) Retirer BOM des fichiers JSON/TS critiques ..." -ForegroundColor Cyan
$targets = @(
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "tsconfig.web.json",
  "electron.vite.config.ts",
  "postcss.config.mjs",
  "src\main\index.ts",
  "src\preload\index.ts",
  "src\renderer\src\catalog.ts",
  "src\renderer\src\print-labels.ts",
  "src\renderer\src\VenteScreen.tsx",
  "src\renderer\src\RetourScreen.tsx",
  "src\renderer\src\variant-code.ts",
  "src\renderer\src\label-tspl.ts",
  "src\renderer\src\LabelsScreen.tsx"
) | ForEach-Object { Join-Path $root $_ }

Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx,*.json,*.mjs,*.css -File -ErrorAction SilentlyContinue |
  ForEach-Object { $targets += $_.FullName }

$targets = $targets | Select-Object -Unique
foreach ($t in $targets) { Remove-Utf8Bom $t }

Write-Host "2) Forcer version 1.1.0 sans BOM ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.0"', 1)
Write-Utf8NoBom $pkgPath $pkg
# verify JSON parses
$null = $pkg | ConvertFrom-Json
Write-Host "  package.json OK version 1.1.0" -ForegroundColor Green

Write-Host "3) Verifier catalog findByScanCode ..." -ForegroundColor Cyan
$catalog = Join-Path $root "src\renderer\src\catalog.ts"
if (Test-Path $catalog) {
  $c = [IO.File]::ReadAllText($catalog)
  if ($c -notmatch 'resolveScanCode') {
    if ($c -notmatch 'from "./variant-code"') {
      $c = "import { resolveScanCode } from `"./variant-code`";`r`n" + $c
    }
  }
  if ($c -notmatch 'export function findByScanCode') {
    $c = $c.TrimEnd() + "`r`n`r`nexport function findByScanCode(raw: string) {`r`n  return resolveScanCode(raw, catalog, findByRef);`r`n}`r`n"
  }
  # dedupe accidental double append
  $c = [regex]::Replace($c, '(export function findByScanCode\(raw: string\) \{[\s\S]*?\n\}\r?\n)+', "export function findByScanCode(raw: string) {`r`n  return resolveScanCode(raw, catalog, findByRef);`r`n}`r`n")
  Write-Utf8NoBom $catalog $c
}

Write-Host "4) Build Setup 1.1.0 ..." -ForegroundColor Cyan
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Build echoue" }

$setup = @(
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.0.exe",
  (Join-Path $root "release\Zella-Luxe-Setup-1.1.0.exe"),
  (Join-Path $root "dist\Zella-Luxe-Setup-1.1.0.exe")
) | Where-Object { Test-Path $_ }

Write-Host ""
if ($setup) {
  Write-Host "OK Setup 1.1.0:" -ForegroundColor Green
  $setup | ForEach-Object { Write-Host "  $_" }
} else {
  Write-Host "Build fini mais Setup 1.1.0 introuvable. Liste:" -ForegroundColor Yellow
  Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup*.exe" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.FullName)" }
}
