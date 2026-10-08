param(
  [Parameter(Mandatory = $true)][string]$Printer,
  [Parameter(Mandatory = $true)][string]$FilePath
)

# Envoi TSPL brut vers une file Windows.
# Ne bloque JAMAIS sur PnP USB / VID_2D37 / "hors ligne" :
# si A4 imprime, la file Windows existe — on l'utilise.

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

function Fail([string]$msg) {
  Write-Output "FAIL $msg"
  exit 1
}

function Ok([string]$msg) {
  Write-Output "OK $msg"
  exit 0
}

if (-not (Test-Path -LiteralPath $FilePath)) {
  Fail "Fichier d'etiquette introuvable."
}

$bytes = $null
try {
  $bytes = [IO.File]::ReadAllBytes($FilePath)
} catch {
  Fail "Impossible de lire le fichier etiquette."
}
if (-not $bytes -or $bytes.Length -eq 0) {
  Fail "Fichier etiquette vide."
}

$queue = Get-Printer -Name $Printer -ErrorAction SilentlyContinue
if (-not $queue) {
  # Correspondance souple (espaces / casse)
  $all = @(Get-Printer -ErrorAction SilentlyContinue)
  $queue = $all | Where-Object { $_.Name -eq $Printer } | Select-Object -First 1
  if (-not $queue) {
    $queue = $all | Where-Object { $_.Name -like "*$Printer*" } | Select-Object -First 1
  }
}
if (-not $queue) {
  Fail "Imprimante introuvable dans Windows: $Printer. Ouvre Parametres Zella et choisis la Xprinter (pas PDF)."
}
$Printer = [string]$queue.Name

# Pilote texte pour laisser passer le TSPL brut (recommandé étiquettes)
try { Add-PrinterDriver -Name "Generic / Text Only" -ErrorAction SilentlyContinue | Out-Null } catch {}
if ($queue.DriverName -ne "Generic / Text Only") {
  try {
    Set-Printer -Name $Printer -DriverName "Generic / Text Only" -ErrorAction SilentlyContinue
    $queue = Get-Printer -Name $Printer -ErrorAction SilentlyContinue
  } catch {}
}

# Sortir du mode "Work Offline" s'il est actif
try {
  $filter = "Name='$($Printer.Replace("'","''"))'"
  $p = Get-CimInstance -ClassName Win32_Printer -Filter $filter -ErrorAction SilentlyContinue
  if (-not $p) {
    $p = Get-WmiObject -Class Win32_Printer -Filter $filter -ErrorAction SilentlyContinue
  }
  if ($p -and $p.WorkOffline) {
    $p.WorkOffline = $false
    try {
      if ($p.PSObject.Methods.Name -contains "Put") { [void]$p.Put() }
      else { Set-CimInstance -InputObject $p -ErrorAction SilentlyContinue }
    } catch {}
  }
} catch {}

$share = "ZellaXP"
try { Set-Printer -Name $Printer -Shared $true -ShareName $share -ErrorAction SilentlyContinue } catch {}

$port = ""
try { $port = [string]$queue.PortName } catch {}

# 1) API spooler RAW (meilleur chemin quand le pilote accepte RAW)
function Send-RawSpooler([string]$printerName, [byte[]]$payload) {
  $code = @"
using System;
using System.Runtime.InteropServices;
public class ZellaRawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
  public static bool Send(string printer, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printer, out hPrinter, IntPtr.Zero)) return false;
    var di = new DOCINFOA();
    di.pDocName = "Zella Label";
    di.pDataType = "RAW";
    if (!StartDocPrinter(hPrinter, 1, di)) { ClosePrinter(hPrinter); return false; }
    if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }
    IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
    Marshal.Copy(bytes, 0, p, bytes.Length);
    int written;
    bool ok = WritePrinter(hPrinter, p, bytes.Length, out written);
    Marshal.FreeCoTaskMem(p);
    EndPagePrinter(hPrinter);
    EndDocPrinter(hPrinter);
    ClosePrinter(hPrinter);
    return ok && written == bytes.Length;
  }
}
"@
  try {
    if (-not ("ZellaRawPrint" -as [type])) {
      Add-Type -TypeDefinition $code -Language CSharp -ErrorAction Stop | Out-Null
    }
    return [ZellaRawPrint]::Send($printerName, $payload)
  } catch {
    return $false
  }
}

if (Send-RawSpooler -printerName $Printer -payload $bytes) {
  Ok "spooler-raw=$Printer"
}

# 2) copy /b vers port USB / partage
$destinations = New-Object System.Collections.Generic.List[string]
if ($port -and $port -match "^(USB|DOT4|LPT|COM)") { [void]$destinations.Add($port) }
[void]$destinations.Add("\\localhost\$share")
[void]$destinations.Add("\\127.0.0.1\$share")
[void]$destinations.Add("\\localhost\$Printer")

foreach ($dest in $destinations) {
  cmd.exe /c "copy /b `"$FilePath`" `"$dest`" >nul 2>nul"
  if ($LASTEXITCODE -eq 0) {
    Ok "copy=$dest"
  }
}

# 3) flux .NET sur le partage
try {
  $fs = [IO.File]::Open("\\localhost\$share", [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::Write, [IO.FileShare]::None)
  $fs.Write($bytes, 0, $bytes.Length)
  $fs.Close()
  Ok "stream=\\localhost\$share"
} catch {}

Fail "Impossible d'envoyer l'etiquette vers '$Printer'. Dans Parametres Zella choisis la Xprinter (pas PDF). Pilote recommande: Generic / Text Only. Imprimante allumee."
