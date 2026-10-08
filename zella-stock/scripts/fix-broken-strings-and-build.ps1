# Repair strings corrupted by mojibake pass, then build 1.1.1 for local test
# ASCII-only script.
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-broken-strings-and-build.ps1

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
function Remove-Utf8Bom([string]$path) {
  if (-not (Test-Path $path)) { return }
  $bytes = [IO.File]::ReadAllBytes($path)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    [IO.File]::WriteAllBytes($path, $bytes[3..($bytes.Length - 1)])
  }
}

function Repair-BrokenUiText([string]$text) {
  # Remove replacement char U+FFFD (use string overload, not char/char)
  $text = $text.Replace([string][char]0xFFFD, "")

  # Force-clean any hint= that mentions etiquette/article (broken quotes safe)
  $cleanHint = 'hint="Passez l''etiquette - l''article apparait en grand ici."'
  $text = [regex]::Replace($text, 'hint\s*=\s*"(?:\\.|[^"\\])*"', {
    param($m)
    if ($m.Value -match 'etiquette|article|Passez|Lecteur') { return $cleanHint }
    return $m.Value
  }, 'IgnoreCase')

  # Patterns like l?T / '?T from broken apostrophes
  $text = [regex]::Replace($text, "([ldns])\?T", '$1''')
  $text = [regex]::Replace($text, "([ldns])'\?T", '$1''')
  $text = [regex]::Replace($text, "\?T", "'")

  # Normalize fancy dashes/minus/dot/multiply via char codes only (char -> char)
  foreach ($ch in @([char]0x2212, [char]0x2013, [char]0x2014, [char]0x00B7, [char]0x2022)) {
    $text = $text.Replace($ch, [char]0x2D)
  }
  foreach ($ch in @([char]0x2018, [char]0x2019)) {
    $text = $text.Replace($ch, [char]0x27)
  }
  foreach ($ch in @([char]0x00D7, [char]0x2715, [char]0x2716)) {
    $text = $text.Replace($ch, [char]0x78)
  }

  return $text
}

Write-Host "1) Repair broken strings ..." -ForegroundColor Cyan
$n = 0
Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx -File | ForEach-Object {
  Remove-Utf8Bom $_.FullName
  $text = [IO.File]::ReadAllText($_.FullName)
  $next = Repair-BrokenUiText $text
  if ($next -ne $text) {
    Write-Utf8NoBom $_.FullName $next
    $n++
    Write-Host ("  OK {0}" -f $_.Name)
  }
}
Write-Host ("  Fixed: {0}" -f $n) -ForegroundColor Green

$vente = Join-Path $root "src\renderer\src\VenteScreen.tsx"
if (Test-Path $vente) {
  $v = [IO.File]::ReadAllText($vente)
  $v = [regex]::Replace(
    $v,
    'hint\s*=\s*"(?:\\.|[^"\\])*"',
    'hint="Passez l''etiquette - l''article apparait en grand ici."'
  )
  # Broader: if file still has FFFD near Passez
  $v = $v.Replace([char]0xFFFD, [string]::Empty)
  Write-Utf8NoBom $vente $v
  Write-Host "  VenteScreen hints cleaned" -ForegroundColor Green
  Select-String -Path $vente -Pattern 'hint=' | Select-Object -First 5 | ForEach-Object {
    Write-Host ("    {0}" -f $_.Line.Trim())
  }
}

Write-Host "2) Refresh label modules ..." -ForegroundColor Cyan
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/cursor/fix-etiquettes-client-8a46/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing
$patchJs = Join-Path $root "scripts\patch-print-labels-layout.mjs"
if (-not (Test-Path $patchJs)) {
  Invoke-WebRequest "$base/scripts/patch-print-labels-layout.mjs" -OutFile $patchJs -UseBasicParsing
}
if (Test-Path (Join-Path $renderer "print-labels.ts")) {
  node $patchJs
}

Write-Host "3) Build 1.1.1 ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.1"', 1)
Write-Utf8NoBom $pkgPath $pkg
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed. Suspicious lines:" -ForegroundColor Red
  Get-ChildItem (Join-Path $root "src\renderer\src\*.tsx") | ForEach-Object {
    $lines = Get-Content $_.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match '\?T' -or $lines[$i].Contains([char]0xFFFD)) {
        Write-Host ("  {0}:{1}: {2}" -f $_.Name, ($i + 1), $lines[$i].Trim())
      }
    }
  }
  throw "Build failed"
}

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
