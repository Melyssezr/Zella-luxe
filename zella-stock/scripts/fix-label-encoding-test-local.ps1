# Fix etiquette 40x20 + caracteres UI, build local pour TEST (pas encore client)
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

function Repair-Mojibake([string]$text) {
  if ($text -notmatch [char]0x00C3 -and $text -notmatch [char]0x00C2 -and $text -notmatch [char]0x201A) {
    # still check common mojibake latin capital A with tilde sequences via regex on UTF8 form
  }
  if ($text -match 'Ã|Â.|â€|âˆ') {
    try {
      $latin1 = [Text.Encoding]::GetEncoding(28591)
      $bytes = $latin1.GetBytes($text)
      $candidate = [Text.Encoding]::UTF8.GetString($bytes)
      $badBefore = ([regex]::Matches($text, 'Ã|Â.|â€|âˆ')).Count
      $badAfter = ([regex]::Matches($candidate, 'Ã|Â.|â€|âˆ')).Count
      if ($badAfter -lt $badBefore) { $text = $candidate }
    } catch {}
  }
  # Normalize symbols that break UI / labels
  $text = $text.Replace([char]0x2212, '-')
  $text = $text.Replace([char]0x2013, '-')
  $text = $text.Replace([char]0x2014, '-')
  $text = $text.Replace([char]0x00B7, '-')
  $text = $text.Replace([char]0x2022, '-')
  $text = $text.Replace([char]0x00D7, 'x')
  $text = $text.Replace([char]0x2715, 'x')
  $text = $text.Replace([char]0x2716, 'x')
  $text = $text.Replace([char]0x2212, '-')
  return $text
}

$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
New-Item -ItemType Directory -Force -Path $renderer | Out-Null

Write-Host "1) label-tspl 40x20 (nom / barcode / couleur-taille) ..." -ForegroundColor Cyan
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing

Write-Host "2) Corriger caracteres deformes dans src\ ..." -ForegroundColor Cyan
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
Write-Host ("  Fichiers corriges: {0}" -f $fixedCount) -ForegroundColor Green

Write-Host "3) Forcer print-labels.ts layout 40x20 (node patch) ..." -ForegroundColor Cyan
$patchJs = Join-Path $root "scripts\patch-print-labels-layout.mjs"
Invoke-WebRequest "$base/scripts/patch-print-labels-layout.mjs" -OutFile $patchJs -UseBasicParsing
if (Test-Path (Join-Path $renderer "print-labels.ts")) {
  Remove-Utf8Bom (Join-Path $renderer "print-labels.ts")
  $p0 = Repair-Mojibake ([IO.File]::ReadAllText((Join-Path $renderer "print-labels.ts")))
  Write-Utf8NoBom (Join-Path $renderer "print-labels.ts") $p0
  node $patchJs
  Write-Host "  Apercu TSPL/marque:" -ForegroundColor DarkGray
  Select-String -Path (Join-Path $renderer "print-labels.ts") -Pattern 'SIZE|ZELLA|buildVariantLabelTspl|BARCODE' |
    Select-Object -First 15 |
    ForEach-Object { Write-Host ("    {0}" -f $_.Line.Trim()) }
} else {
  Write-Host "  print-labels.ts absent" -ForegroundColor Yellow
}

Write-Host "4) Build 1.1.1 local ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.1"', 1)
Write-Utf8NoBom $pkgPath $pkg

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Build echoue" }

# Patch print-raw into unpacked for immediate test
$printRawSrc = Join-Path $root "scripts\print-raw.ps1"
$printRawDst = "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1"
if ((Test-Path $printRawSrc) -and (Test-Path "D:\zella-luxe-release\win-unpacked\resources")) {
  New-Item -ItemType Directory -Force -Path (Split-Path $printRawDst) | Out-Null
  Copy-Item -Force $printRawSrc $printRawDst
}

Write-Host ""
Write-Host "=== PRET POUR TEST SUR CE PC ===" -ForegroundColor Green
Write-Host "1. Ferme Zella Luxe"
Write-Host "2. Lance:  D:\zella-luxe-release\win-unpacked\Zella Luxe.exe"
Write-Host "3. UI: plus de caracteres bizarres (scannA / A- / minus foireux)"
Write-Host "4. Etiquette: NOM en haut, CODE-BARRES au milieu, COULEUR+TAILLE en bas"
Write-Host "   (plus de ZELLA LUXE, police plus petite, 40x20)"
Write-Host "5. Dis-moi le resultat AVANT envoi au client"
Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.1.exe","D:\zella-luxe-release\Zella-Luxe-Setup-1.1.0.exe" -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Host ("Fichier: {0}" -f $_.FullName) }
