import { app, BrowserWindow, ipcMain, screen } from "electron";
import { join } from "path";

const TITLEBAR = "#65232B";

function windowSize() {
  const area = screen.getPrimaryDisplay().workAreaSize;
  const maxW = Math.max(1024, area.width - 48);
  const maxH = Math.max(576, area.height - 48);
  let width = Math.min(1600, maxW);
  let height = Math.round((width * 9) / 16);
  if (height > Math.min(900, maxH)) {
    height = Math.min(900, maxH);
    width = Math.round((height * 16) / 9);
  }
  return {
    width: Math.max(1024, width),
    height: Math.max(576, height),
  };
}

function createWindow(): void {
  const { width, height } = windowSize();
  const window = new BrowserWindow({
    width,
    height,
    minWidth: 1024,
    minHeight: 576,
    title: "Zella Stock — Zella Luxe",
    backgroundColor: TITLEBAR,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: TITLEBAR,
      symbolColor: "#FFF8F0",
      height: 32,
    },
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
    },
  });

  window.on("ready-to-show", () => {
    window.show();
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    window.loadURL(devUrl);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function publishUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.hostname === "zellaluxe.net") url.hostname = "www.zellaluxe.net";
    return url.toString();
  } catch {
    return raw.replace("://zellaluxe.net", "://www.zellaluxe.net");
  }
}

app.whenReady().then(() => {
  ipcMain.handle("site:request", async (_event, payload: { url: string; key: string; body: unknown }) => {
    const res = await fetch(publishUrl(payload.url), {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${payload.key}`,
      },
      body: JSON.stringify(payload.body),
    });
    const redirected = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    const finalRes = redirected
      ? await fetch(publishUrl(redirected), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${payload.key}`,
          },
          body: JSON.stringify(payload.body),
        })
      : res;
    const data = await finalRes.json().catch(() => ({}));
    return { ok: finalRes.ok, status: finalRes.status, data };
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
