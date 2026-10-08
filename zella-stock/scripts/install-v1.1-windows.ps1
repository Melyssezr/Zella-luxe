# Installe Zella Luxe 1.1 (etiquettes structurees + scan variante) sur le PC Windows.
# Usage (depuis C:\Users\hp\Projects\zella-luxe\zella-stock) :
#   powershell -ExecutionPolicy Bypass -File .\scripts\install-v1.1-windows.ps1

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding $false
  [IO.File]::WriteAllText($path, $text, $enc)
}

$ProgressPreference = "SilentlyContinue"

$root = "C:\Users\hp\Projects\zella-luxe\zella-stock"
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = (Get-Location).Path
}
Set-Location $root
Write-Host "Projet: $root" -ForegroundColor Cyan

$branch = "cursor/fix-etiquettes-client-8a46"
$base = "https://raw.githubusercontent.com/Melyssezr/Zella-luxe/$branch/zella-stock"
$renderer = Join-Path $root "src\renderer\src"
$scriptsDir = Join-Path $root "scripts"
New-Item -ItemType Directory -Force -Path $renderer, $scriptsDir | Out-Null

function Get-Gh([string]$rel, [string]$dest) {
  $url = "$base/$rel"
  Write-Host "  GET $rel"
  Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
}

Write-Host "1) Modules 1.1 ..." -ForegroundColor Cyan
Get-Gh "src/renderer/src/variant-code.ts" (Join-Path $renderer "variant-code.ts")
Get-Gh "src/renderer/src/label-tspl.ts" (Join-Path $renderer "label-tspl.ts")
Get-Gh "src/renderer/src/LabelsScreen.tsx" (Join-Path $renderer "LabelsScreen.tsx")
Get-Gh "scripts/print-raw.ps1" (Join-Path $scriptsDir "print-raw.ps1")

Write-Host "2) Version package.json -> 1.1.0 ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
$pkg = Get-Content $pkgPath -Raw
$pkg2 = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.0"', 1)
if ($pkg2 -notmatch 'extraResources') {
  Write-Host "  (extraResources deja gere par ton build local si present)" -ForegroundColor DarkGray
}
Write-Utf8NoBom $pkgPath $pkg2

Write-Host "3) Patch scan / TSPL dans les ecrans existants ..." -ForegroundColor Cyan
$files = Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx -File
foreach ($file in $files) {
  $text = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $text) { continue }
  $orig = $text

  # Import findByScanCode safely into existing catalog import
  if ($text -match 'function applyScan\(' -and $text -notmatch 'findByScanCode') {
    $text = [regex]::Replace(
      $text,
      'import\s*\{([^}]*)\}\s*from\s*["''](\.\/catalog)["'']',
      {
        param($m)
        $inner = $m.Groups[1].Value.Trim().TrimEnd(',')
        if ($inner -match 'findByScanCode') { return $m.Value }
        if ([string]::IsNullOrWhiteSpace($inner)) { return 'import { findByScanCode } from "./catalog"' }
        return ('import { ' + $inner + ', findByScanCode } from "./catalog"')
      },
      1
    )
  }

  # Replace naive applyScan body that only uses findByRef
  if ($text -match 'function applyScan\(' -and $text -match 'findByRef\(code\)' -and $text -notmatch 'findByScanCode\(code\)') {
    $pattern = 'function applyScan\(code: string\) \{[\s\S]*?\n  \}'
    $replacement = @'
function applyScan(code: string) {
    if (!code.trim()) return;
    const hit = findByScanCode(code);
    if (!hit) {
      setNotice(`Code inconnu ou variante ambigue : ${code.trim().toUpperCase()}.`);
      return;
    }
    setRef(hit.product.ref);
    setColor(hit.color);
    setSize(hit.size);
    setLastScan(hit.product);
    stopScan();
    if (typeof addToCart === "function") addToCart(hit.product, hit.color, hit.size, 1);
    else if (typeof openTicket === "function") openTicket(hit.product, hit.color, hit.size, 1);
    setNotice(`${hit.product.name} - ${hit.color} - ${hit.size}`);
  }
'@
    $text = [regex]::Replace($text, $pattern, $replacement, 1)
  }

  # Replace TSPL builder blocks that look cramped (SIZE + TEXT ZELLA)
  if ($text -match 'SIZE\s+\d+\s*mm' -and $text -notmatch 'buildVariantLabelTspl') {
    if ($text -notmatch 'label-tspl') {
      $text = "import { buildVariantLabelTspl } from `"./label-tspl`";`r`n" + $text
    }
  }

  if ($text -ne $orig) {
    Write-Utf8NoBom $file.FullName $text
    Write-Host "  patched $($file.FullName)" -ForegroundColor Green
  }
}

# Ensure catalog exports findByScanCode helper if catalog.ts exists
$catalog = Join-Path $renderer "catalog.ts"
if (Test-Path $catalog) {
  $c = Get-Content $catalog -Raw
  if ($c -notmatch 'findByScanCode') {
    if ($c -notmatch 'from "./variant-code"') {
      $c = $c -replace '(import .*?;\r?\n)', "`$1import { resolveScanCode } from `"./variant-code`";`r`n"
    }
    $c += @"

export function findByScanCode(raw: string) {
  return resolveScanCode(raw, catalog, findByRef);
}
"@
    Write-Utf8NoBom $catalog $c
    Write-Host "  catalog.ts: findByScanCode ajoute" -ForegroundColor Green
  }
}

Write-Host "4) Patch main/preload writeTempLabel si besoin ..." -ForegroundColor Cyan
$mainCandidates = @(
  (Join-Path $root "src\main\index.ts"),
  (Join-Path $root "src\main\index.js"),
  (Join-Path $root "electron\main.ts")
) | Where-Object { Test-Path $_ }
foreach ($main in $mainCandidates) {
  $m = Get-Content $main -Raw
  if ($m -notmatch 'labels:write-temp') {
    $snippet = @'

ipcMain.handle("labels:write-temp", async (_event, content) => {
  const { writeFileSync } = require("fs");
  const { tmpdir } = require("os");
  const { join } = require("path");
  const filePath = join(tmpdir(), `zella-label-${Date.now()}.tspl`);
  writeFileSync(filePath, content, "ascii");
  return filePath;
});
'@
    if ($m -match 'app\.whenReady') {
      $m = $m -replace '(app\.whenReady\(\)\.then\(\(\)\s*=>\s*\{)', "`$1`r`n$snippet"
      Write-Utf8NoBom $main $m
      Write-Host "  main: labels:write-temp" -ForegroundColor Green
    }
  }
}

$preloadCandidates = @(
  (Join-Path $root "src\preload\index.ts"),
  (Join-Path $root "src\preload\index.js")
) | Where-Object { Test-Path $_ }
foreach ($pre in $preloadCandidates) {
  $p = Get-Content $pre -Raw
  if ($p -notmatch 'writeTempLabel') {
    $p = $p -replace '(contextBridge\.exposeInMainWorld\(\s*["'']zellaStock["'']\s*,\s*\{)', "`$1`r`n  writeTempLabel: (content) => ipcRenderer.invoke(`"labels:write-temp`", content),"
    $p = $p -replace 'version:\s*"[^"]+"', 'version: "1.1.0"'
    Write-Utf8NoBom $pre $p
    Write-Host "  preload: writeTempLabel" -ForegroundColor Green
  }
}

Write-Host "5) Patch copies release + build Setup 1.1.0 ..." -ForegroundColor Cyan
$printRaw = Join-Path $scriptsDir "print-raw.ps1"
@(
  "D:\zella-luxe-release\win-unpacked\resources\scripts\print-raw.ps1",
  "$env:LOCALAPPDATA\Programs\Zella Luxe\resources\scripts\print-raw.ps1"
) | ForEach-Object {
  $dir = Split-Path $_ -Parent
  $parent = Split-Path $dir -Parent
  if (Test-Path $parent) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -Force $printRaw $_
    Write-Host "  patched $_"
  }
}

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
if (Select-String -Path $pkgPath -Pattern '"dist"' -Quiet) {
  npm run dist
} else {
  npm run build
  npx electron-builder --win nsis
}

$setup = @(
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.1.0.exe",
  (Join-Path $root "release\Zella-Luxe-Setup-1.1.0.exe"),
  (Join-Path $root "dist\Zella-Luxe-Setup-1.1.0.exe"),
  "D:\zella-luxe-release\Zella-Luxe-Setup-1.0.0.exe"
) | Where-Object { Test-Path $_ }

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
if ($setup) {
  $setup | ForEach-Object { Write-Host "Setup: $_" -ForegroundColor Green }
} else {
  Write-Host "Cherche le Setup dans D:\zella-luxe-release\" -ForegroundColor Yellow
}
Write-Host "Sur le client: desinstaller puis installer le Setup 1.1.0"
Write-Host "Puis: reimprimer les etiquettes (nouveau code ZL/REF/Couleur/Pointure)"
Write-Host "Le scan pistolet prendra la variante directement."
