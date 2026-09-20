/**
 * World Express (Ecotrack) API client.
 * Docs pattern: Bearer token → https://world-express.ecotrack.dz/api/v1/...
 */

const DEFAULT_BASE = "https://world-express.ecotrack.dz";

export type WorldExpressConfig = {
  token: string;
  baseUrl: string;
};

export type CreateParcelInput = {
  reference: string;
  customerName: string;
  phone: string;
  address: string;
  commune: string;
  wilayaCode: string | number;
  amount: number;
  productSummary: string;
  note?: string;
  /** HOME = domicile, OFFICE = stop desk */
  deliveryMethod: "HOME" | "OFFICE";
  /** ID stop-desk Ecotrack (si mode OFFICE) */
  stopDeskId?: string | number;
};

export type CreateParcelResult = {
  ok: true;
  tracking: string;
  raw: unknown;
} | {
  ok: false;
  error: string;
  raw?: unknown;
};

export function getWorldExpressConfig(): WorldExpressConfig | null {
  const token = process.env.WORLD_EXPRESS_TOKEN?.trim();
  if (!token) return null;
  const baseUrl = (process.env.WORLD_EXPRESS_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  return { token, baseUrl };
}

export function isWorldExpressConfigured(): boolean {
  return Boolean(getWorldExpressConfig());
}

/** Ecotrack expects 9–10 digit local phone (often 05xxxxxxxx). */
export function toEcotrackPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("213") && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && /^[567]/.test(digits)) {
    digits = `0${digits}`;
  }
  return digits;
}

function wilayaId(code: string | number): number {
  const n = typeof code === "number" ? code : Number.parseInt(String(code).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

async function weFetch(
  config: WorldExpressConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function testWorldExpressCredentials(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const config = getWorldExpressConfig();
  if (!config) return { ok: false, error: "WORLD_EXPRESS_TOKEN manquant" };

  try {
    const res = await weFetch(config, "/api/v1/get/wilayas");
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Token invalide ou non autorisé" };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

function extractTracking(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const candidates = [
    o.tracking,
    o.Tracking,
    o.tracking_number,
    o.trackingNumber,
    o.track,
    o.code,
    o.reference,
  ];
  if (o.data && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    candidates.push(d.tracking, d.Tracking, d.tracking_number, d.code);
  }
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number") return String(c);
  }
  return null;
}

function formatEcotrackErrors(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const o = data as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.message === "string" && o.message.trim()) parts.push(o.message.trim());

  const errors = o.errors;
  if (errors && typeof errors === "object") {
    for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.map(String).join(", ")}`);
      } else if (typeof val === "string") {
        parts.push(`${key}: ${val}`);
      }
    }
  }
  return parts.length > 0 ? parts.join(" · ") : fallback;
}

export async function fetchWorldExpressCommunes(
  wilayaCode: string | number
): Promise<{ ok: true; communes: string[] } | { ok: false; error: string }> {
  const config = getWorldExpressConfig();
  if (!config) return { ok: false, error: "WORLD_EXPRESS_TOKEN manquant" };
  const id = wilayaId(wilayaCode);
  if (id < 1) return { ok: false, error: "Wilaya invalide" };

  try {
    const paths = [
      `/api/v1/get/communes?wilaya_id=${id}`,
      `/api/v1/get/communes/${id}`,
      `/api/v1/communes?wilaya_id=${id}`,
    ];
    for (const path of paths) {
      const res = await weFetch(config, path);
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const list = normalizeCommuneList(data);
      if (list.length > 0) return { ok: true, communes: list };
    }
    return { ok: false, error: "Impossible de charger les communes World Express" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

function normalizeCommuneList(data: unknown): string[] {
  if (!data) return [];
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? Array.isArray((data as { communes?: unknown }).communes)
        ? (data as { communes: unknown[] }).communes
        : Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : []
      : [];

  const names = new Set<string>();
  for (const row of arr) {
    if (typeof row === "string" && row.trim()) {
      names.add(row.trim());
      continue;
    }
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const name = o.nom || o.name || o.commune || o.commune_name || o.nom_commune;
      if (typeof name === "string" && name.trim()) names.add(name.trim());
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}

export type WorldExpressFee = {
  wilayaCode: string;
  homePrice: number;
  officePrice: number;
};

export type WorldExpressCenter = {
  wilayaCode: string;
  name: string;
  address?: string;
  stationCode?: string;
};

function padWilayaCode(id: string | number): string {
  const n = wilayaId(id);
  if (n < 1) return "";
  return String(n).padStart(2, "0");
}

function numField(o: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = o[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function extractArray(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  if (o.data && typeof o.data === "object") {
    const d = o.data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(d[key])) return d[key] as unknown[];
    }
    if (Array.isArray(o.data)) return o.data as unknown[];
  }
  return [];
}

/** Tarifs domicile / stop-desk par wilaya (GET /api/v1/get/fees). */
export async function fetchWorldExpressFees(): Promise<
  { ok: true; fees: WorldExpressFee[] } | { ok: false; error: string }
> {
  const config = getWorldExpressConfig();
  if (!config) return { ok: false, error: "WORLD_EXPRESS_TOKEN manquant" };

  try {
    const res = await weFetch(config, "/api/v1/get/fees");
    if (!res.ok) {
      return { ok: false, error: `Tarifs World Express: HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => null);
    const rows = extractArray(data, ["livraison", "fees", "tarifs", "data"]);
    const fees: WorldExpressFee[] = [];

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const code = padWilayaCode(
        (o.wilaya_id ?? o.wilayaId ?? o.code_wilaya ?? o.code ?? o.id) as string | number
      );
      if (!code) continue;

      const home = numField(o, [
        "tarif",
        "tarif_domicile",
        "prix",
        "prix_domicile",
        "home",
        "home_fee",
        "homeDeliveryPrice",
        "domicile",
      ]);
      const office = numField(o, [
        "tarif_stopdesk",
        "tarif_stop_desk",
        "tarif_sd",
        "prix_stopdesk",
        "stopdesk",
        "stop_desk",
        "stopDeskPrice",
        "bureau",
        "office",
      ]);

      if (home == null && office == null) continue;
      fees.push({
        wilayaCode: code,
        homePrice: home ?? office ?? 0,
        officePrice: office ?? home ?? 0,
      });
    }

    if (fees.length === 0) {
      return { ok: false, error: "Aucun tarif trouvé dans la réponse World Express" };
    }
    return { ok: true, fees };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

/** Bureaux / stop-desks (essaie plusieurs endpoints Ecotrack). */
export async function fetchWorldExpressCenters(): Promise<
  | { ok: true; centers: WorldExpressCenter[]; source: string }
  | { ok: false; error: string }
> {
  const config = getWorldExpressConfig();
  if (!config) return { ok: false, error: "WORLD_EXPRESS_TOKEN manquant" };

  const paths = [
    "/api/v1/get/centers",
    "/api/v1/get/stations",
    "/api/v1/get/stopdesks",
    "/api/v1/centers",
    "/api/v1/stations",
  ];

  try {
    for (const path of paths) {
      const res = await weFetch(config, path);
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const centers = normalizeCenterList(data);
      if (centers.length > 0) {
        return { ok: true, centers, source: path };
      }
    }
    return {
      ok: false,
      error:
        "Liste des bureaux indisponible via l’API (Ecotrack n’expose pas toujours les stop-desks).",
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

function normalizeCenterList(data: unknown): WorldExpressCenter[] {
  const rows = extractArray(data, [
    "centers",
    "stations",
    "stopdesks",
    "stop_desks",
    "bureaux",
    "data",
  ]);
  const out: WorldExpressCenter[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const code = padWilayaCode(
      (o.wilaya_id ?? o.wilayaId ?? o.code_wilaya ?? o.wilaya) as string | number
    );
    const nameRaw =
      o.name ?? o.nom ?? o.center_name ?? o.station_name ?? o.nom_centre ?? o.label;
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    if (!code || !name) continue;

    const stationRaw =
      o.center_id ?? o.station_code ?? o.stationCode ?? o.id_station ?? o.id ?? o.code;
    const addressRaw = o.address ?? o.adresse ?? o.addr;
    out.push({
      wilayaCode: code,
      name,
      address: typeof addressRaw === "string" && addressRaw.trim() ? addressRaw.trim() : undefined,
      stationCode:
        stationRaw != null && String(stationRaw).trim() !== ""
          ? String(stationRaw).trim()
          : undefined,
    });
  }
  return out;
}

export async function createWorldExpressParcel(
  input: CreateParcelInput
): Promise<CreateParcelResult> {
  const config = getWorldExpressConfig();
  if (!config) {
    return { ok: false, error: "World Express non configuré (WORLD_EXPRESS_TOKEN)" };
  }

  const phone = toEcotrackPhone(input.phone);
  if (phone.length < 9 || phone.length > 10) {
    return { ok: false, error: `Téléphone invalide pour Ecotrack: ${phone}` };
  }

  const codeWilaya = wilayaId(input.wilayaCode);
  if (codeWilaya < 1 || codeWilaya > 58) {
    return { ok: false, error: `Code wilaya invalide: ${input.wilayaCode}` };
  }

  const commune = input.commune.trim();
  if (commune.length < 2) {
    return {
      ok: false,
      error: "Commune manquante. Indiquez une commune officielle (ex. Adrar).",
    };
  }

  // Respecter strictement le choix commande : HOME → domicile, OFFICE → stop-desk
  const isOffice = input.deliveryMethod === "OFFICE";
  const stopDeskId =
    input.stopDeskId != null && String(input.stopDeskId).trim() !== ""
      ? String(input.stopDeskId).trim()
      : "";

  const payload: Record<string, unknown> = {
    reference: input.reference.slice(0, 255),
    nom_client: input.customerName.slice(0, 255),
    telephone: phone,
    adresse: input.address.slice(0, 255),
    commune: commune.slice(0, 255),
    code_wilaya: codeWilaya,
    montant: Math.round(input.amount),
    remarque: (input.note ?? "").slice(0, 255),
    produit: input.productSummary.slice(0, 255),
    type: 1, // livraison
    stop_desk: isOffice ? 1 : 0,
  };

  // ID station Ecotrack si connu (améliore le routage vers le bon bureau)
  if (isOffice && stopDeskId) {
    payload.station_code = stopDeskId;
    payload.id_station = stopDeskId;
  }

  try {
    const res = await weFetch(config, "/api/v1/create/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: formatEcotrackErrors(data, `HTTP ${res.status}`),
        raw: data,
      };
    }

    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      (data as { success: unknown }).success === false
    ) {
      return {
        ok: false,
        error: formatEcotrackErrors(data, "Création colis refusée"),
        raw: data,
      };
    }

    const tracking = extractTracking(data);
    if (!tracking) {
      return {
        ok: false,
        error: "Réponse World Express sans numéro de suivi",
        raw: data,
      };
    }

    return { ok: true, tracking, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur réseau World Express",
    };
  }
}

export function buildProductSummary(
  items: Array<{ nameFr?: string; quantity?: number; size?: string; color?: string }>
): string {
  const parts = items.map((i) => {
    const extras = [i.size, i.color].filter(Boolean).join("/");
    return `${i.nameFr ?? "Article"}${extras ? ` (${extras})` : ""} x${i.quantity ?? 1}`;
  });
  const text = parts.join(" · ");
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}
