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
  siteUrl: "https://zellaluxe.net",
  siteKey: "zella-stock-dev",
  lastSync: "",
  lastBackup: "",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<AppSettings> };
    const url = saved.siteUrl.trim();
    if (!url || /localhost|127\.0\.0\.1/i.test(url)) {
      saved.siteUrl = DEFAULT_SETTINGS.siteUrl;
    }
    return saved;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
