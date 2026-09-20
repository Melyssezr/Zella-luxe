import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("zellaStock", {
  version: "0.1.0",
  siteRequest: (payload: { url: string; key: string; body: unknown }) =>
    ipcRenderer.invoke("site:request", payload),
});
