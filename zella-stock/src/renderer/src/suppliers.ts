export type Supplier = {
  id: string;
  name: string;
};

const KEY = "zella-stock-suppliers";

const SEED: Supplier[] = [
  { id: "s1", name: "Fashion Shoes" },
  { id: "s2", name: "Moda DZ" },
  { id: "s3", name: "Atelier Oran" },
];

let listeners = new Set<() => void>();
let suppliers: Supplier[] = load();

function load(): Supplier[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED.map((item) => ({ ...item }));
    const parsed = JSON.parse(raw) as Supplier[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED.map((item) => ({ ...item }));
    return parsed;
  } catch {
    return SEED.map((item) => ({ ...item }));
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(suppliers));
  listeners.forEach((fn) => fn());
}

export function subscribeSuppliers(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listSuppliers(): Supplier[] {
  return suppliers;
}

export function addSupplier(name: string): Supplier | undefined {
  const label = name.trim();
  if (!label) return undefined;
  const existing = suppliers.find((item) => item.name.toLowerCase() === label.toLowerCase());
  if (existing) return existing;
  const next = { id: `s-${Date.now()}`, name: label };
  suppliers = [...suppliers, next];
  persist();
  return next;
}
