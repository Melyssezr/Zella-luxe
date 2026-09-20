export type AppSettings = {
  boutique: string;
  city: string;
  phone: string;
  address: string;
  lowStock: number;
  displayName: string;
  ticketNote: string;
  syncSite: boolean;
  siteUrl: string;
  siteKey: string;
  lastSync: string;
  lastBackup: string;
};

const KEY = "zella-stock-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  boutique: "Zella Luxe",
  city: "Annaba",
  phone: "",
  address: "",
  lowStock: 2,
  displayName: "",
  ticketNote: "Merci pour votre visite.",
  syncSite: false,
  siteUrl: "https://www.zellaluxe.net",
  siteKey: "zella-stock-dev",
  lastSync: "",
  lastBackup: "",
};

function canonicalSiteUrl(url: string) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed || /localhost|127\.0\.0\.1/i.test(trimmed)) return DEFAULT_SETTINGS.siteUrl;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "zellaluxe.net") parsed.hostname = "www.zellaluxe.net";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<AppSettings> };
    saved.siteUrl = canonicalSiteUrl(saved.siteUrl);
    return saved;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
