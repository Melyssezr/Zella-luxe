# Test rapide d'envoi TSPL sans ouvrir Zella Luxe.
$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$printRaw = Join-Path $scriptDir "print-raw.ps1"
if (-not (Test-Path $printRaw)) {
  Write-Host "FAIL print-raw.ps1 manquant"
  exit 1
}

$candidates = @(Get-Printer -ErrorAction SilentlyContinue)
$printer = $candidates | Where-Object { $_.Name -match "xprinter|xp-?410|ZellaXP" } | Select-Object -First 1
if (-not $printer) {
  $printer = $candidates | Where-Object { $_.Name -notmatch "PDF|OneNote|Fax|XPS|Microsoft" } | Select-Object -First 1
}
if (-not $printer) {
  Write-Host "FAIL Aucune imprimante Windows trouvee"
  exit 2
}

Write-Host ("Imprimante: {0}" -f $printer.Name)
Write-Host ("Pilote:     {0}" -f $printer.DriverName)
Write-Host ("Port:       {0}" -f $printer.PortName)

$tspl = @"
SIZE 40 mm, 30 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 20,20,"0",0,1,1,"ZELLA TEST"
PRINT 1,1
"@
$path = Join-Path $env:TEMP "zella-test-label.tspl"
[IO.File]::WriteAllText($path, $tspl, [Text.Encoding]::ASCII)

& $printRaw -Printer $printer.Name -FilePath $path
exit $LASTEXITCODE
