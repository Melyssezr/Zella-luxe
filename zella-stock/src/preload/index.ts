import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("zellaStock", {
  version: "1.1.0",
  getVersion: () => ipcRenderer.invoke("app:version") as Promise<string>,
  listPrinters: () => ipcRenderer.invoke("printers:list") as Promise<string[]>,
  printRawLabel: (payload: { printerName: string; filePath: string }) =>
    ipcRenderer.invoke("labels:print-raw", payload) as Promise<
      { ok: true; detail: string } | { ok: false; error: string }
    >,
  getPrintScriptPath: () => ipcRenderer.invoke("labels:script-path") as Promise<string | null>,
  writeTempLabel: (content: string) =>
    ipcRenderer.invoke("labels:write-temp", content) as Promise<string>,
  siteRequest: (payload: { url: string; key: string; body: unknown }) =>
    ipcRenderer.invoke("site:request", payload),
});
