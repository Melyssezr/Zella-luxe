# Separe imports React / catalog casses par le patch, puis build 1.1.0
#   powershell -ExecutionPolicy Bypass -File .\scripts\fix-imports-split-and-build-1.1.ps1

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
  }
}

$reactNames = @(
  'useMemo','useState','useSyncExternalStore','useEffect','useRef','useCallback',
  'useLayoutEffect','useId','useReducer','useContext','Fragment','StrictMode',
  'FormEvent','ChangeEvent','KeyboardEvent','ReactNode','CSSProperties','react'
)

function Repair-CatalogImportFile([string]$path) {
  if (-not (Test-Path $path)) { return $false }
  Remove-Utf8Bom $path
  $text = [IO.File]::ReadAllText($path)
  $orig = $text

  # Trouver import ... from "./catalog"
  $m = [regex]::Match($text, 'import\s*\{([^}]*)\}\s*from\s*["'']\./catalog["''];')
  if (-not $m.Success) { return $false }

  $inner = $m.Groups[1].Value
  # Extraire identifiants (ignore "type")
  $tokens = [regex]::Matches($inner, 'type\s+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*') |
    ForEach-Object { $_.Value }

  $reactParts = New-Object System.Collections.Generic.List[string]
  $catalogParts = New-Object System.Collections.Generic.List[string]

  foreach ($tok in $tokens) {
    if ($tok -eq 'type' -or $tok -eq 'from' -or $tok -eq 'import' -or $tok -eq 'catalog') { continue }
    $name = $tok -replace '^type\s+',''
    $isType = $tok -match '^type\s+'
    if ($reactNames -contains $name -or $name -eq 'react') {
      if ($name -ne 'react') {
        if ($isType) { [void]$reactParts.Add("type $name") } else { [void]$reactParts.Add($name) }
      }
      continue
    }
    if ($isType) { [void]$catalogParts.Add("type $name") } else { [void]$catalogParts.Add($name) }
  }

  if ($catalogParts -notcontains 'findByScanCode') { [void]$catalogParts.Add('findByScanCode') }

  # Dedup preserve order
  $reactParts = @($reactParts | Select-Object -Unique)
  $catalogParts = @($catalogParts | Select-Object -Unique)

  $newBlocks = @()
  # Keep existing react import if present; else add if we extracted react names
  $hasReactImport = $text -match 'from\s*["'']react["'']'
  if ($reactParts.Count -gt 0) {
    $reactLine = 'import { ' + ($reactParts -join ', ') + ' } from "react";'
    if ($hasReactImport) {
      $text = [regex]::Replace($text, 'import\s*\{[^}]*\}\s*from\s*["'']react["''];', $reactLine, 1)
    } else {
      $newBlocks += $reactLine
    }
  }

  $catalogLine = 'import { ' + ($catalogParts -join ', ') + ' } from "./catalog";'
  $text = [regex]::Replace($text, 'import\s*\{[^}]*\}\s*from\s*["'']\./catalog["''];', $catalogLine, 1)

  if ($newBlocks.Count -gt 0) {
    # insert react import at top after any existing imports start
    $text = ($newBlocks -join "`r`n") + "`r`n" + $text
  }

  # Remove accidental "import { ... react ...}" leftovers / duplicate react imports
  $text = [regex]::Replace($text, '(import\s*\{[^}]*\}\s*from\s*["'']react["''];\s*){2,}', {
    param($mm)
    $one = [regex]::Match($mm.Value, 'import\s*\{[^}]*\}\s*from\s*["'']react["''];').Value
    return $one + "`r`n"
  })

  if ($text -ne $orig) {
    Write-Utf8NoBom $path $text
    Write-Host "  OK $path" -ForegroundColor Green
    Select-String -Path $path -Pattern 'from "(react|\./catalog)"' | ForEach-Object {
      Write-Host "    $($_.Line.Trim())"
    }
    return $true
  }
  Write-Host "  inchange $path" -ForegroundColor DarkGray
  return $false
}

Write-Host "1) Reparer VenteScreen / RetourScreen ..." -ForegroundColor Cyan
[void](Repair-CatalogImportFile (Join-Path $root "src\renderer\src\VenteScreen.tsx"))
[void](Repair-CatalogImportFile (Join-Path $root "src\renderer\src\RetourScreen.tsx"))

# Extra safety: if VenteScreen still imports hooks from catalog, force rewrite first imports
$vente = Join-Path $root "src\renderer\src\VenteScreen.tsx"
$v = [IO.File]::ReadAllText($vente)
if ($v -match 'useSyncExternalStore[^;]*from "\./catalog"') {
  Write-Host "  Force rewrite VenteScreen header imports" -ForegroundColor Yellow
  # Remove ALL import lines from react and catalog, rebuild
  $v = [regex]::Replace($v, 'import\s*\{[^}]*\}\s*from\s*["'']react["''];\s*', '')
  $catalogMatch = [regex]::Match($v, 'import\s*\{([^}]*)\}\s*from\s*["'']\./catalog["''];')
  $inner = if ($catalogMatch.Success) { $catalogMatch.Groups[1].Value } else { '' }
  $v = [regex]::Replace($v, 'import\s*\{[^}]*\}\s*from\s*["'']\./catalog["''];\s*', '')

  $tokens = [regex]::Matches($inner, 'type\s+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*') | ForEach-Object { $_.Value }
  $reactParts = @()
  $catalogParts = @()
  foreach ($tok in $tokens) {
    $name = $tok -replace '^type\s+',''
    if ($name -in @('type','from','import','catalog','react')) { continue }
    if ($reactNames -contains $name) { $reactParts += $name; continue }
    if ($tok -match '^type\s+') { $catalogParts += "type $name" } else { $catalogParts += $name }
  }
  # defaults commonly required by VenteScreen
  foreach ($need in @('useMemo','useState','useSyncExternalStore')) {
    if ($reactParts -notcontains $need) { $reactParts += $need }
  }
  foreach ($need in @('availableQty','findByRef','formatPrice','listCatalog','subscribeCatalog','findByScanCode')) {
    if ($catalogParts -notcontains $need -and ($inner -match $need -or $need -eq 'findByScanCode' -or $v -match $need)) {
      if ($catalogParts -notcontains $need) { $catalogParts += $need }
    }
  }
  # Keep whatever catalog symbols were listed
  $catalogParts = @($catalogParts | Select-Object -Unique)
  if ($catalogParts -notcontains 'type CatalogProduct' -and ($inner -match 'CatalogProduct' -or $v -match 'CatalogProduct')) {
    $catalogParts = @('type CatalogProduct') + $catalogParts
  }
  $reactParts = @($reactParts | Select-Object -Unique)

  # Also pull catalog symbols still referenced that were in broken import
  foreach ($sym in @('addStock','removeStock','resolveProductPhoto','resolveScan')) {
    if ($v -match "\b$sym\b" -and $catalogParts -notcontains $sym) { $catalogParts += $sym }
  }

  $header = @(
    ('import { ' + ($reactParts -join ', ') + ' } from "react";'),
    ('import { ' + ($catalogParts -join ', ') + ' } from "./catalog";')
  ) -join "`r`n"
  $v = $header + "`r`n" + $v.TrimStart()
  Write-Utf8NoBom $vente $v
  Write-Host "  rewritten:" -ForegroundColor Green
  Get-Content $vente -TotalCount 8 | ForEach-Object { Write-Host "    $_" }
}

Write-Host "2) package.json 1.1.0 ..." -ForegroundColor Cyan
$pkgPath = Join-Path $root "package.json"
Remove-Utf8Bom $pkgPath
$pkg = [IO.File]::ReadAllText($pkgPath)
$pkg = [regex]::Replace($pkg, '"version"\s*:\s*"[^"]+"', '"version": "1.1.0"', 1)
Write-Utf8NoBom $pkgPath $pkg

Write-Host "3) Build Setup 1.1.0 ..." -ForegroundColor Cyan
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
if ($LASTEXITCODE -ne 0) { throw "Build echoue - envoie les premieres lignes de VenteScreen.tsx" }

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
  Get-ChildItem "D:\zella-luxe-release\Zella-Luxe-Setup*.exe" -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host $_.FullName }
}
