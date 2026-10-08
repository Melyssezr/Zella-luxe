# Fix label 40x20 + UI encoding. ASCII-only script for Windows PowerShell 5.1
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-label-encoding-test-local.ps1

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

function Test-HasMojibake([string]$text) {
  # UTF-8 mojibake often contains U+00C3 (A tilde) or U+00C2 (A circumflex)
  return ($text.IndexOf([char]0x00C3) -ge 0) -or ($text.IndexOf([char]0x00C2) -ge 0) -or ($text.IndexOf([char]0x201A) -ge 0) -or ($text.IndexOf([char]0x20AC) -ge 0)
}

function Count-MojibakeMarks([string]$text) {
  $n = 0
  foreach ($ch in @([char]0x00C3, [char]0x00C2, [char]0x201A, [char]0x20AC)) {
    $i = 0
    while (($i = $text.IndexOf($ch, $i)) -ge 0) { $n++; $i++ }
  }
  return $n
}

function Repair-Mojibake([string]$text) {
  if (Test-HasMojibake $text) {
    try {
      $latin1 = [Text.Encoding]::GetEncoding(28591)
      $bytes = $latin1.GetBytes($text)
      $candidate = [Text.Encoding]::UTF8.GetString($bytes)
      $before = Count-MojibakeMarks $text
      $after = Count-MojibakeMarks $candidate
      if ($after -lt $before) { $text = $candidate }
    } catch {}
  }

  # Normalize fancy minus / dots / multiply that break UI
  $text = $text.Replace([char]0x2212, [char]0x2D) # minus -> hyphen
  $text = $text.Replace([char]0x2013, [char]0x2D) # en dash
  $text = $text.Replace([char]0x2014, [char]0x2D) # em dash
  $text = $text.Replace([char]0x00B7, [char]0x2D) # middle dot
  $text = $text.Replace([char]0x2022, [char]0x2D) # bullet
  $text = $text.Replace([char]0x00D7, [char]0x78) # multiply -> x
  $text = $text.Replace([char]0x2715, [char]0x78)
  $text = $text.Replace([char]0x2716, [char]0x78)
  return $text
}

$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
New-Item -ItemType Directory -Force -Path $renderer | Out-Null

Write-Host "1) Download label-tspl 40x20 ..." -ForegroundColor Cyan
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing

Write-Host "2) Fix mojibake in src ..." -ForegroundColor Cyan
$fixedCount = 0
Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx,*.css,*.json -File | ForEach-Object {
  Remove-Utf8Bom $_.FullName
  $text = [IO.File]::ReadAllText($_.FullName)
  $next = Repair-Mojibake $text
  if ($next -ne $text) {
    Write-Utf8NoBom $_.FullName $next
    $fixedCount++
    Write-Host ("  OK {0}" -f $_.Name)
  }
}
Write-Host ("  Fixed files: {0}" -f $fixedCount) -ForegroundColor Green

Write-Host "3) Patch print-labels.ts layout ..." -ForegroundColor Cyan
$patchJs = Join-Path $root "scripts\patch-print-labels-layout.mjs"
Invoke-WebRequest "$base/scripts/patch-print-labels-layout.mjs" -OutFile $patchJs -UseBasicParsing
$printLabels = Join-Path $renderer "print-labels.ts"
if (Test-Path $printLabels) {
  Remove-Utf8Bom $printLabels
  $p0 = Repair-Mojibake ([IO.File]::ReadAllText($printLabels))
  Write-Utf8NoBom $printLabels $p0
  node $patchJs
  Select-String -Path $printLabels -Pattern "SIZE|ZELLA|buildVariantLabelTspl|BARCODE" |
    Select-Object -First 15 |
    ForEach-Object { Write-Host ("    {0}" -f $_.Line.Trim()) }
} else {
  Write-Host "  print-labels.ts missing" -ForegroundColor Yellow
}

Write-Host "4) Build local 1.1.1 ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
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
Write-Host "=== READY FOR LOCAL TEST ===" -ForegroundColor Green
Write-Host "1. Close Zella Luxe"
Write-Host "2. Run: D:\zella-luxe-release\win-unpacked\Zella Luxe.exe"
Write-Host "3. Check UI encoding + print a 40x20 label"
Write-Host "4. Tell me result BEFORE sending to client"
Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.1.exe","D:\zella-luxe-release\Zella-Luxe-Setup-1.1.0.exe" -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Host ("File: {0}" -f $_.FullName) }
