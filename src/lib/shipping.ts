export type ShippingWilaya = {
  id: string;
  code: string;
  nameFr: string;
  nameAr: string;
  homeShippingPrice: number;
  officeShippingPrice: number;
};

export type ShippingOffice = {
  id: string;
  wilayaId: string;
  nameFr: string;
  nameAr: string;
};

export type DeliveryMethod = "HOME" | "OFFICE";

const NEAR_ALGIERS = new Set(["09", "10", "16", "26", "35", "42"]);
const MAJOR_CITIES = new Set(["06", "16", "19", "23", "25", "31"]);
const REMOTE = new Set(["01", "08", "11", "30", "33", "37", "47", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58"]);

export function getDefaultShippingPrices(code: string): { home: number; office: number } {
  if (NEAR_ALGIERS.has(code)) return { home: 500, office: 300 };
  if (MAJOR_CITIES.has(code)) return { home: 600, office: 400 };
  if (REMOTE.has(code)) return { home: 1200, office: 800 };
  return { home: 800, office: 500 };
}

export function getWilayaLabel(w: Pick<ShippingWilaya, "code" | "nameFr" | "nameAr">, lang: "fr" | "ar") {
  return lang === "fr" ? `${w.code} — ${w.nameFr}` : `${w.code} — ${w.nameAr}`;
}

export function getOfficeLabel(o: Pick<ShippingOffice, "nameFr" | "nameAr">, lang: "fr" | "ar") {
  return lang === "fr" ? o.nameFr : o.nameAr;
}

export function getShippingCost(
  wilayas: ShippingWilaya[],
  wilayaCode: string,
  method: DeliveryMethod | ""
): number {
  if (!wilayaCode || !method) return 0;
  const wilaya = wilayas.find((w) => w.code === wilayaCode);
  if (!wilaya) return 0;
  return method === "HOME" ? wilaya.homeShippingPrice : wilaya.officeShippingPrice;
}

export function buildOrderAddress(params: {
  lang: "fr" | "ar";
  method: DeliveryMethod;
  wilaya: ShippingWilaya;
  deliveryAddress?: string;
  office?: Pick<ShippingOffice, "nameFr" | "nameAr">;
}): string {
  const wilayaLabel = getWilayaLabel(params.wilaya, params.lang);
  if (params.method === "HOME") {
    const tag = params.lang === "fr" ? "À domicile" : "توصيل للمنزل";
    return `[${tag}] ${wilayaLabel} — ${params.deliveryAddress?.trim() ?? ""}`;
  }
  const tag = params.lang === "fr" ? "Bureau" : "مكتب";
  const officeLabel = params.office ? getOfficeLabel(params.office, params.lang) : "";
  return `[${tag}] ${wilayaLabel} — ${officeLabel}`;
}
