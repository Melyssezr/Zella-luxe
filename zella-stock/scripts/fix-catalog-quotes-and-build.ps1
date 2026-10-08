# Fix leftover broken quotes in catalog.ts then build 1.1.1
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-catalog-quotes-and-build.ps1

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$root = "C:\Users\hp\Projects\zella-luxe\zella-stock"
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }
Set-Location $root
Write-Host "Projet: $root" -ForegroundColor Cyan

function Write-Utf8NoBom([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $text, $enc)
}

Write-Host "1) Fix broken quotes across src ..." -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx -File | ForEach-Object {
  $text = [IO.File]::ReadAllText($_.FullName)
  $orig = $text

  # || "?"";  -> || "-";
  $text = $text.Replace('|| "?"";', '|| "-";')
  $text = $text.Replace('|| "?""', '|| "-"')
  $text = $text.Replace('"?""', '"-"')

  # join(" / ") || "?""; exact line from build error
  $text = $text.Replace(
    '.join(" / ") || "?"";',
    '.join(" / ") || "-";'
  )
  $text = $text.Replace(
    '.filter(Boolean).join(" / ") || "?"";',
    '.filter(Boolean).join(" / ") || "-";'
  )

  # leftover mojibake word fragments in seed descriptions (ASCII fallback)


  # Fix UTF-8 mojibake of e-acute inside seed strings: C3 83 C2 A9 or literal A-tilde sequences
  $text = $text.Replace([string]([char]0x00C3) + [string]([char]0x00A9), "e")

  # collapse double spaces in descriptions
  $text = [regex]::Replace($text, 'caisse  - ', 'caisse - ')

  if ($text -ne $orig) {
    Write-Utf8NoBom $_.FullName $text
    Write-Host ("  OK {0}" -f $_.Name)
  }
}

$catalog = Join-Path $root "src\renderer\src\catalog.ts"
Select-String -Path $catalog -Pattern '\?\""|join\(" / "\)' | Select-Object -First 10 | ForEach-Object {
  Write-Host ("  catalog:{0}: {1}" -f $_.LineNumber, $_.Line.Trim())
}

Write-Host "2) Build ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.1"', 1)
Write-Utf8NoBom $pkgPath $pkg
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$printRawSrc = Join-Path $root "scripts\print-raw.ps1"
$printRawDst = "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1"
if ((Test-Path $printRawSrc) -and (Test-Path "D:\zella-luxe-release\win-unpacked\resources")) {
  New-Item -ItemType Directory -Force -Path (Split-Path $printRawDst) | Out-Null
  Copy-Item -Force $printRawSrc $printRawDst
}

Write-Host ""
Write-Host "=== READY LOCAL TEST ===" -ForegroundColor Green
Write-Host "Run: D:\zella-luxe-release\win-unpacked\Zella Luxe.exe"
Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.1.exe" -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Host ("Setup: {0}" -f $_.FullName) }
