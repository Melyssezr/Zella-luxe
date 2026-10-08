# Repair broken import from install-v1.1 patch, then build Setup 1.1.0
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-vente-import-and-build-1.1.ps1

$ErrorActionPreference = "Stop"
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
    Write-Host "  BOM retire: $path"
  }
}

Write-Host "1) Reparer imports casses ..." -ForegroundColor Cyan
$files = @(
  (Join-Path $root "src\renderer\src\VenteScreen.tsx"),
  (Join-Path $root "src\renderer\src\RetourScreen.tsx"),
  (Join-Path $root "src\renderer\src\SortieScreen.tsx"),
  (Join-Path $root "src\renderer\src\EntreeScreen.tsx"),
  (Join-Path $root "src\renderer\src\print-labels.ts"),
  (Join-Path $root "src\renderer\src\catalog.ts")
)

foreach ($path in $files) {
  if (-not (Test-Path $path)) { continue }
  Remove-Utf8Bom $path
  $text = [IO.File]::ReadAllText($path)
  $orig = $text

  # Fix ", findByScanCode} from" / "{, findByScanCode" patterns
  $text = $text -replace ',\s*findByScanCode\s*,\s*findByScanCode', ', findByScanCode'
  $text = $text -replace '\{\s*,\s*findByScanCode', '{ findByScanCode'
  $text = $text -replace ',\s*,\s*findByScanCode', ', findByScanCode'
  $text = $text -replace 'type CatalogProduct,\s*\r?\n\s*,\s*findByScanCode\s*\}', 'type CatalogProduct, findByScanCode }'
  $text = $text -replace 'type CatalogProduct,\r?\n,\s*findByScanCode\}', 'type CatalogProduct, findByScanCode }'
  $text = $text -replace '(\r?\n)\s*,\s*findByScanCode\s*\} from', '$1  findByScanCode } from'

  # If findByScanCode used but not imported from catalog
  if ($text -match 'findByScanCode\(' -and $text -match 'from ["'']/.*catalog["'']' -and $text -notmatch 'findByScanCode\s*[,}]') {
    $text = [regex]::Replace(
      $text,
      'import\s*\{([^}]*)\}\s*from\s*["''](\./catalog)["'']',
      {
        param($m)
        $inner = $m.Groups[1].Value.Trim().TrimEnd(',')
        if ($inner -match 'findByScanCode') { return $m.Value }
        if ($inner -eq '') { return 'import { findByScanCode } from "./catalog"' }
        return ('import { ' + $inner + ', findByScanCode } from "./catalog"')
      },
      1
    )
  }

  # catalog: ensure resolveScanCode import + single findByScanCode export
  if ($path -like '*\catalog.ts') {
    if ($text -notmatch 'from ["'']\./variant-code["'']') {
      $text = 'import { resolveScanCode } from "./variant-code";' + "`r`n" + $text
    }
    if ($text -notmatch 'export function findByScanCode') {
      $text = $text.TrimEnd() + "`r`n`r`nexport function findByScanCode(raw: string) {`r`n  return resolveScanCode(raw, catalog, findByRef);`r`n}`r`n"
    } else {
      $text = [regex]::Replace(
        $text,
        '(export function findByScanCode\(raw: string\) \{[\s\S]*?\n\}\r?\n)+',
        "export function findByScanCode(raw: string) {`r`n  return resolveScanCode(raw, catalog, findByRef);`r`n}`r`n"
      )
    }
  }

  if ($text -ne $orig) {
    Write-Utf8NoBom $path $text
    Write-Host "  OK $($path.Replace($root, '.'))" -ForegroundColor Green
  } else {
    Write-Host "  inchange $($path.Replace($root, '.'))" -ForegroundColor DarkGray
  }
}

# Explicit fix for the known broken VenteScreen line
$vente = Join-Path $root "src\renderer\src\VenteScreen.tsx"
if (Test-Path $vente) {
  $v = [IO.File]::ReadAllText($vente)
  $v2 = [regex]::Replace(
    $v,
    'type CatalogProduct,\s*\r?\n\s*,\s*findByScanCode\s*\} from ["'']\./catalog["'']',
    'type CatalogProduct, findByScanCode } from "./catalog"'
  )
  $v2 = $v2 -replace 'type CatalogProduct,\r?\n,\s*findByScanCode\} from "\./catalog";', 'type CatalogProduct, findByScanCode } from "./catalog";'
  if ($v2 -match ',\s*findByScanCode\} from') {
    $v2 = $v2 -replace ',\s*\r?\n\s*,\s*findByScanCode\} from "\./catalog";', ', findByScanCode } from "./catalog";'
  }
  # brute force: rewrite any import block from ./catalog that is broken
  if ($v2 -match ',\s*findByScanCode\}' -or $v2 -match '\n,\s*findByScanCode') {
    $v2 = [regex]::Replace(
      $v2,
      'import\s*\{[\s\S]*?\}\s*from\s*["'']\./catalog["''];',
      {
        param($m)
        $block = $m.Value
        $names = [regex]::Matches($block, '[A-Za-z_][A-Za-z0-9_]*') | ForEach-Object { $_.Value } |
          Where-Object { $_ -notin @('import','from','catalog','type') }
        $names = @($names | Select-Object -Unique)
        if ($names -notcontains 'findByScanCode') { $names += 'findByScanCode' }
        # keep "type CatalogProduct" if present
        $parts = @()
        foreach ($n in $names) {
          if ($n -eq 'CatalogProduct') { $parts += 'type CatalogProduct' }
          elseif ($n -ne 'type') { $parts += $n }
        }
        $parts = $parts | Select-Object -Unique
        return 'import { ' + ($parts -join ', ') + ' } from "./catalog";'
      },
      1
    )
  }
  Write-Utf8NoBom $vente $v2
  Write-Host "  VenteScreen import force-fixe" -ForegroundColor Green
  Select-String -Path $vente -Pattern 'from "./catalog"' | ForEach-Object { Write-Host "   -> $($_.Line.Trim())" }
}

Write-Host "2) package.json 1.1.0 sans BOM ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.0"', 1)
Write-Utf8NoBom $pkgPath $pkg
$null = $pkg | ConvertFrom-Json

Write-Host "3) Build ..." -ForegroundColor Cyan
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
  Write-Host "OK Setup 1.1.0 :" -ForegroundColor Green
  $setup | ForEach-Object { Write-Host "  $_" }
} else {
  Write-Host "Setup 1.1.0 introuvable - liste D:\zella-luxe-release :" -ForegroundColor Yellow
  Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup*.exe" -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $($_.FullName)" }
}
