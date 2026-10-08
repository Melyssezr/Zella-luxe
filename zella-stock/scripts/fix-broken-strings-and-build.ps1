# Repair strings corrupted by mojibake pass, then build 1.1.1 for local test
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
  # Remove replacement char U+FFFD
  $text = $text.Replace([char]0xFFFD, '')

  # Broken hint on VenteScreen / ScanGunField (quote-breaking corruption)
  $text = [regex]::Replace(
    $text,
    'hint\s*=\s*"[^"]*(etiquette|article)[^"]*"',
    'hint="Passez l''etiquette - l''article apparait en grand ici."',
    'IgnoreCase'
  )

  # Common corrupted fragments -> clean ASCII French
  $pairs = @(
    @("l'?T", "l'"),
    @("l?T", "l'"),
    @("d'?T", "d'"),
    @("n'?T", "n'"),
    @("s'?T", "s'"),
    @("'?T", "'"),
    @("?T", "'"),
    @("â€™", "'"),
    @("â€˜", "'"),
    @("â€“", "-"),
    @("â€”", "-"),
    @("âˆ’", "-"),
    @("Â·", "-"),
    @("Ã©", "e"),
    @("Ã¨", "e"),
    @("Ãª", "e"),
    @("Ã ", "a"),
    @("Ã§", "c"),
    @("Ã®", "i"),
    @("Ã´", "o"),
    @("Ã¹", "u"),
    @("Ã‰", "E"),
    @("scannÃ©", "scanne"),
    @("scannÃ©e", "scannee"),
    @("apparaÃ®t", "apparait"),
    @("Ã©tiquette", "etiquette"),
    @("Ã©tiquettes", "etiquettes")
  )
  foreach ($pair in $pairs) {
    $text = $text.Replace($pair[0], $pair[1])
  }

  # If a double-quoted JSX/TS string got split by a rogue quote from corruption,
  # fix known ScanGunField hint line more aggressively (even with newlines)
  $text = [regex]::Replace(
    $text,
    'hint=\{?"Passez[\s\S]*?ici\."\}?',
    'hint="Passez l''etiquette - l''article apparait en grand ici."'
  )

  # Normalize fancy dashes/minus again
  foreach ($ch in @([char]0x2212, [char]0x2013, [char]0x2014, [char]0x00B7, [char]0x2022)) {
    $text = $text.Replace($ch, '-')
  }
  foreach ($ch in @([char]0x00D7, [char]0x2715, [char]0x2716)) {
    $text = $text.Replace($ch, 'x')
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

# Explicit VenteScreen safety: rewrite any hint= near ScanGunField
$vente = Join-Path $root "src\renderer\src\VenteScreen.tsx"
if (Test-Path $vente) {
  $v = [IO.File]::ReadAllText($vente)
  $v2 = [regex]::Replace(
    $v,
    '(<ScanGunField[\s\S]*?hint\s*=\s*)(?:"[^"]*"|\{[^}]*\})',
    '$1"Passez l''etiquette - l''article apparait en grand ici."'
  )
  # If still contains replacement char near line with etiquette
  if ($v2.IndexOf([char]0xFFFD) -ge 0) {
    $v2 = $v2.Replace([char]0xFFFD, '')
  }
  # Fix the exact broken pattern from build log
  $v2 = $v2 -replace 'hint="Passez[^"]*ici\."', 'hint="Passez l''etiquette - l''article apparait en grand ici."'
  Write-Utf8NoBom $vente $v2
  Write-Host "  VenteScreen hint forced clean" -ForegroundColor Green
  Select-String -Path $vente -Pattern 'hint=' | Select-Object -First 5 | ForEach-Object { Write-Host ("    {0}" -f $_.Line.Trim()) }
}

Write-Host "2) Ensure label-tspl present ..." -ForegroundColor Cyan
$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing
if (Test-Path (Join-Path $root "scripts\patch-print-labels-layout.mjs")) {
  node (Join-Path $root "scripts\patch-print-labels-layout.mjs")
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
  Write-Host "Build failed - showing suspicious lines:" -ForegroundColor Red
  Get-ChildItem (Join-Path $root "src\renderer\src") -Filter *.tsx | ForEach-Object {
    Select-String -Path $_.FullName -Pattern ([char]0xFFFD), '\?T', 'Ã', 'Â' -SimpleMatch:$false -ErrorAction SilentlyContinue |
      Select-Object -First 3
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
Write-Host "Then print a label and check UI text"
Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.1.exe" -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Host ("Setup: {0}" -f $_.FullName) }
