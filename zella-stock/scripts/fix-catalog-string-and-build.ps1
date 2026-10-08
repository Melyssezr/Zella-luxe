# Fix broken string literals (catalog.ts etc.) then build 1.1.1
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-catalog-string-and-build.ps1

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

Write-Host "1) Fix broken quoted strings ..." -ForegroundColor Cyan
$files = Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx -File
foreach ($f in $files) {
  $text = [IO.File]::ReadAllText($f.FullName)
  $orig = $text

  # Pattern: "something ?" word."  -> "something - word."
  $text = [regex]::Replace($text, '"([^"\r\n]*)\?"\s+([A-Za-z][^"\r\n]*)"', '"$1 - $2"')

  # Pattern: "something ?" word.",
  $text = [regex]::Replace($text, '"([^"\r\n]*)\?"\s+([A-Za-z][^"\r\n]*)"\s*,', '"$1 - $2",')

  # Specific known break
  $text = $text.Replace(
    'description: "Produit test caisse ?" escarpin.",',
    'description: "Produit test caisse - escarpin.",'
  )
  $text = $text.Replace(
    'description: "Produit test caisse ?" escarpin."',
    'description: "Produit test caisse - escarpin."'
  )

  # Remove U+FFFD safely
  $text = ($text.ToCharArray() | Where-Object { $_ -ne [char]0xFFFD }) -join ""

  # Clean hints again
  $text = [regex]::Replace(
    $text,
    'hint\s*=\s*"(?:\\.|[^"\\])*"',
    'hint="Passez l''etiquette - l''article apparait en grand ici."'
  )

  if ($text -ne $orig) {
    Write-Utf8NoBom $f.FullName $text
    Write-Host ("  OK {0}" -f $f.Name)
  }
}

# Show catalog line around description if still bad
$catalog = Join-Path $root "src\renderer\src\catalog.ts"
if (Test-Path $catalog) {
  $lines = Get-Content $catalog
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'Produit test caisse|description:.*"\s+[A-Za-z]') {
      Write-Host ("  catalog:{0}: {1}" -f ($i + 1), $lines[$i].Trim())
    }
  }
}

Write-Host "2) Refresh label-tspl ..." -ForegroundColor Cyan
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/cursor/fix-etiquettes-client-8a46/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing
$patchJs = Join-Path $root "scripts\patch-print-labels-layout.mjs"
if (-not (Test-Path $patchJs)) {
  Invoke-WebRequest "$base/scripts/patch-print-labels-layout.mjs" -OutFile $patchJs -UseBasicParsing
}
if (Test-Path (Join-Path $renderer "print-labels.ts")) { node $patchJs }

Write-Host "3) Build ..." -ForegroundColor Cyan
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
