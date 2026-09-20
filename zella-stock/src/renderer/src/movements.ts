export type MoveType = "entree" | "sortie" | "inventaire" | "retour";
export type ActorStyle = "gold" | "outline";

export type Movement = {
  id: string;
  at: number;
  type: MoveType;
  ref: string;
  product: string;
  qty: number;
  by: string;
  actor: ActorStyle;
  supplier?: string;
  cost?: number;
  invoice?: string;
  color?: string;
  size?: string;
  note?: string;
};

const TYPE_LABEL: Record<MoveType, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  inventaire: "Inventaire",
  retour: "Retour",
};

let seq = 0;
let listeners = new Set<() => void>();

function atDay(month: number, day: number, hours: number, minutes: number) {
  return new Date(2026, month - 1, day, hours, minutes).getTime();
}

let moves: Movement[] = [
  { id: "m1", at: atDay(8, 21, 14, 32), type: "entree", ref: "ESC-001", product: "Escarpin Luna · Noir 38", qty: 8, by: "Fayssal", actor: "gold" },
  { id: "m2", at: atDay(8, 21, 11, 4), type: "sortie", ref: "ESC-001", product: "Escarpin Luna · Noir 39", qty: -1, by: "Boutique", actor: "outline" },
  { id: "m3", at: atDay(8, 20, 16, 18), type: "sortie", ref: "SAN-021", product: "Sandale Mia · Beige 39", qty: -2, by: "Boutique", actor: "outline" },
  { id: "m4", at: atDay(8, 20, 9, 41), type: "inventaire", ref: "ZL-VAL-03", product: "Valise rigide · Beige Grande", qty: 1, by: "Inventaire", actor: "outline" },
  { id: "m5", at: atDay(8, 19, 17, 12), type: "retour", ref: "ESC-001", product: "Escarpin Luna · Beige 37", qty: 1, by: "Fayssal", actor: "gold" },
  { id: "m6", at: atDay(8, 19, 10, 5), type: "entree", ref: "ZL-SAC-02", product: "Mini Sac Élégance · Noir Unique", qty: 4, by: "Fayssal", actor: "gold" },
  { id: "m7", at: atDay(8, 18, 15, 50), type: "sortie", ref: "SAC-032", product: "Sac Élégance · Noir", qty: -1, by: "Boutique", actor: "outline" },
  { id: "m8", at: atDay(8, 18, 11, 22), type: "retour", ref: "SAC-032", product: "Sac Élégance · Noir", qty: 1, by: "Vendeur", actor: "gold" },
  { id: "m9", at: atDay(8, 17, 9, 14), type: "entree", ref: "ZL-VAL-03", product: "Valise rigide · Beige Cabine", qty: 2, by: "Fayssal", actor: "gold" },
  { id: "m10", at: atDay(8, 21, 11, 4), type: "sortie", ref: "ZL-ESC-12", product: "Escarpin satin · Noir 39", qty: -1, by: "Boutique", actor: "outline" },
  { id: "m11", at: atDay(8, 19, 17, 12), type: "retour", ref: "ZL-SAC-08", product: "Mini seau cuir · Champagne Unique", qty: 1, by: "Fayssal", actor: "gold" },
  { id: "m12", at: atDay(9, 5, 22, 28), type: "entree", ref: "ESC-001", product: "Escarpin Luna · Noir 38", qty: 10, by: "Admin", actor: "gold", supplier: "Fashion Shoes", cost: 3500, color: "Noir", size: "38", invoice: "FAC-2026-089" },
  { id: "m13", at: atDay(9, 5, 22, 31), type: "entree", ref: "SAN-021", product: "Sandale Mia · Beige 39", qty: 14, by: "Admin", actor: "gold", supplier: "Moda DZ", cost: 2500, color: "Beige", size: "39", invoice: "FAC-2026-090" },
];

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeMovements(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listMovements(): Movement[] {
  return moves;
}

export function typeLabel(type: MoveType): string {
  return TYPE_LABEL[type];
}

export function formatMoveDate(value: number): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export function formatMoveDay(value: number): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function productLine(name: string, color?: string, size?: string): string {
  return [name, [color, size].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

export function logMovement(input: Omit<Movement, "id" | "at"> & { at?: number }): Movement {
  seq += 1;
  const row: Movement = {
    ...input,
    id: `live-${Date.now()}-${seq}`,
    at: input.at ?? Date.now(),
  };
  moves = [row, ...moves];
  emit();
  return row;
}
