import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { app } from "electron";

/** Résout le script TSPL livré dans resources/scripts (install NSIS / pack). */
export function resolvePrintRawScript(): string | null {
  const candidates = [
    join(process.resourcesPath, "scripts", "print-raw.ps1"),
    join(app.getAppPath(), "scripts", "print-raw.ps1"),
    join(app.getAppPath(), "..", "scripts", "print-raw.ps1"),
    join(__dirname, "../../scripts/print-raw.ps1"),
    join(process.cwd(), "scripts", "print-raw.ps1"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export type RawPrintResult = { ok: true; detail: string } | { ok: false; error: string };

/**
 * Envoie un fichier TSPL via print-raw.ps1.
 * Aucun check PnP USB / VID — Windows + file d'attente suffisent (A4 qui marche = OK).
 */
export function printRawFile(printerName: string, filePath: string): Promise<RawPrintResult> {
  return new Promise((resolve) => {
    const printer = printerName.trim();
    if (!printer) {
      resolve({ ok: false, error: "Choisis l'imprimante Xprinter dans Paramètres." });
      return;
    }
    if (!existsSync(filePath)) {
      resolve({ ok: false, error: "Fichier d'étiquette introuvable." });
      return;
    }
    const script = resolvePrintRawScript();
    if (!script) {
      resolve({
        ok: false,
        error: "Script print-raw.ps1 manquant. Reinstalle Zella Luxe 1.1.0.",
      });
      return;
    }

    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-Printer",
        printer,
        "-FilePath",
        filePath,
      ],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => {
      resolve({ ok: false, error: err.message || "Impossible de lancer PowerShell." });
    });
    child.on("close", (code) => {
      const line = (stdout || stderr).trim().split(/\r?\n/).filter(Boolean).pop() || "";
      if (code === 0 && /^OK\b/i.test(line)) {
        resolve({ ok: true, detail: line.replace(/^OK\s*/i, "") || "envoyé" });
        return;
      }
      const fail = line.replace(/^FAIL\s*/i, "").trim();
      resolve({
        ok: false,
        error:
          fail ||
          "Échec impression étiquette. Paramètres → Xprinter + pilote Generic / Text Only.",
      });
    });
  });
}
