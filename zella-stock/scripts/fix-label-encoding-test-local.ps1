# Fix: etiquette 40x20 (nom / barcode / couleur-taille) + caracteres UI (mojibake)
# Test local uniquement (pas encore pour le client).
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

$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock"
$renderer = Join-Path $root "src\renderer\src"

Write-Host "1) Telecharger label-tspl 40x20 ..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $renderer | Out-Null
Invoke-WebRequest "$base/src/renderer/src/label-tspl.ts" -OutFile (Join-Path $renderer "label-tspl.ts") -UseBasicParsing
Invoke-WebRequest "$base/src/renderer/src/variant-code.ts" -OutFile (Join-Path $renderer "variant-code.ts") -UseBasicParsing

Write-Host "2) Corriger mojibake UI (Ã©, Â·, â€™, âˆ') ..." -ForegroundColor Cyan
$map = [ordered]@{
  'Ã©' = 'e'; 'Ã¨' = 'e'; 'Ãª' = 'e'; 'Ã«' = 'e'
  'Ã¡' = 'a'; 'Ã ' = 'a'; 'Ã¢' = 'a'; 'Ã¤' = 'a'
  'Ã®' = 'i'; 'Ã¯' = 'i'; 'Ã­' = 'i'
  'Ã´' = 'o'; 'Ã¶' = 'o'; 'Ã³' = 'o'
  'Ã¹' = 'u'; 'Ã»' = 'u'; 'Ã¼' = 'u'
  'Ã§' = 'c'; 'Ã‰' = 'E'; 'Ã€' = 'A'
  'â€™' = "'"; 'â€˜' = "'"; 'â€œ' = '"'; 'â€' = '"'
  'â€“' = '-'; 'â€”' = '-'; 'âˆ’' = '-'; 'âˆ'' = '-'
  'Â·' = '-'; 'Â' = ''; 'Ã—' = 'x'; 'Ã—' = 'x'
  'lâ€™' = "l'"; 'dâ€™' = "d'"; 'nâ€™' = "n'"; 'sâ€™' = "s'"
  'â†’' = '->'; 'â€¦' = '...'
}
# Prefer proper French when possible (UI), after stripping double-encoding leftovers
$frMap = [ordered]@{
  'scannÃ©' = 'scanne'; 'scannÃ©e' = 'scannee'
  'Ã©tiquette' = 'etiquette'; 'Ã©tiquettes' = 'etiquettes'
  'apparaÃ®t' = 'apparait'; 'sÃ©lection' = 'selection'
  'Changer lâ€™article' = "Changer l'article"
  'Changer l''article' = "Changer l'article"
}

$files = Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx,*.css,*.json -File
$fixedCount = 0
foreach ($f in $files) {
  Remove-Utf8Bom $f.FullName
  $text = [IO.File]::ReadAllText($f.FullName)
  $orig = $text

  # Try full latin1->utf8 undo if file looks double-encoded
  if ($text -match 'Ã.|Â.|â€') {
    try {
      $latin1 = [Text.Encoding]::GetEncoding(28591)
      $bytes = $latin1.GetBytes($text)
      $candidate = [Text.Encoding]::UTF8.GetString($bytes)
      # Only keep if it reduces mojibake markers
      $badBefore = ([regex]::Matches($text, 'Ã.|Â.|â€')).Count
      $badAfter = ([regex]::Matches($candidate, 'Ã.|Â.|â€')).Count
      if ($badAfter -lt $badBefore) { $text = $candidate }
    } catch {}
  }

  foreach ($k in $frMap.Keys) { $text = $text.Replace([string]$k, [string]$frMap[$k]) }
  foreach ($k in $map.Keys) { $text = $text.Replace([string]$k, [string]$map[$k]) }

  # Normalize unicode minus / bullets / fancy dashes in UI source
  $text = $text.Replace([char]0x2212, '-')   # minus
  $text = $text.Replace([char]0x2013, '-')   # en dash
  $text = $text.Replace([char]0x2014, '-')   # em dash
  $text = $text.Replace([char]0x00B7, '-')   # middle dot
  $text = $text.Replace([char]0x2022, '-')   # bullet
  $text = $text.Replace([char]0x00D7, 'x')   # multiplication sign
  $text = $text.Replace([char]0x2715, 'x')
  $text = $text.Replace([char]0x2716, 'x')

  if ($text -ne $orig) {
    Write-Utf8NoBom $f.FullName $text
    $fixedCount++
    Write-Host "  encoding: $($f.Name)"
  }
}
Write-Host "  Fichiers corriges: $fixedCount" -ForegroundColor Green

Write-Host "3) Brancher print-labels.ts sur layout 40x20 ..." -ForegroundColor Cyan
$printLabels = Join-Path $renderer "print-labels.ts"
if (Test-Path $printLabels) {
  Remove-Utf8Bom $printLabels
  $p = [IO.File]::ReadAllText($printLabels)
  if ($p -notmatch 'buildVariantLabelTspl') {
    $p = "import { buildVariantLabelTspl } from `"./label-tspl`";`r`n" + $p
  }
  # If there is a function that builds TSPL with SIZE, wrap/replace common patterns
  if ($p -match 'ZELLA LUXE' -or $p -match 'SIZE\s+\d+\s*mm') {
    # Replace hardcoded brand line
    $p = $p -replace 'ZELLA LUXE', ''
    $p = $p -replace 'SIZE\s+\d+\s*mm\s*,\s*\d+\s*mm', 'SIZE 40 mm, 20 mm'
  }

  # Inject helper export used by printers if missing
  if ($p -notmatch 'export function buildLabelTspl40x20') {
    $helper = @'

/** Layout 40x20: nom / barcode / couleur-taille (sans marque). */
export function buildLabelTspl40x20(opts: {
  name: string;
  color: string;
  size: string;
  barcode: string;
  category?: string;
  copies?: number;
}): string {
  const product = {
    ref: "X",
    name: opts.name,
    category: opts.category || "",
    price: 0,
    promoPrice: 0,
    onPromo: false,
  } as any;
  return buildVariantLabelTspl({
    product,
    color: opts.color || "Unique",
    size: opts.size || "Unique",
    copies: opts.copies || 1,
    barcode: opts.barcode,
  });
}
'@
    $p = $p.TrimEnd() + "`r`n" + $helper + "`r`n"
  }
  Write-Utf8NoBom $printLabels $p
  Write-Host "  print-labels.ts OK" -ForegroundColor Green
} else {
  Write-Host "  print-labels.ts introuvable (layout via label-tspl seulement)" -ForegroundColor Yellow
}

# Ensure catalog still exports findByScanCode
$catalog = Join-Path $renderer "catalog.ts"
if (Test-Path $catalog) {
  Remove-Utf8Bom $catalog
  $c = [IO.File]::ReadAllText($catalog)
  if ($c -notmatch 'from "./variant-code"') {
    $c = 'import { resolveScanCode } from "./variant-code";' + "`r`n" + $c
  }
  if ($c -notmatch 'export function findByScanCode') {
    $c += "`r`nexport function findByScanCode(raw: string) {`r`n  return resolveScanCode(raw, catalog, findByRef);`r`n}`r`n"
  }
  Write-Utf8NoBom $catalog $c
}

Write-Host "4) Build local 1.1.1 pour test ici ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.1"', 1)
Write-Utf8NoBom $pkgPath $pkg

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Build echoue" }

Write-Host ""
Write-Host "=== TEST LOCAL ===" -ForegroundColor Green
Write-Host "1. Ferme Zella Luxe"
Write-Host "2. Lance: D:\zella-luxe-release\win-unpacked\Zella Luxe.exe"
Write-Host "   (ou reinstalle D:\zella-luxe-release\Zella-Luxe-Setup-1.1.1.exe sur CE PC seulement)"
Write-Host "3. Verifie UI: plus de scannA, A-, caracteres bizarres"
Write-Host "4. Imprime une etiquette 40x20: nom haut, barcode milieu, couleur/taille bas"
Write-Host "5. Dis-moi si OK avant envoi client"
Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup*.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 3 |
  ForEach-Object { Write-Host ("Setup: {0}" -f $_.FullName) }
