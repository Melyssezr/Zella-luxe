import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  formatMoveDate,
  formatMoveDay,
  listMovements,
  subscribeMovements,
  typeLabel,
  type MoveType,
} from "./movements";

export function HistoriqueScreen() {
  const rows = useSyncExternalStore(subscribeMovements, listMovements, listMovements);
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("");
  const [type, setType] = useState<"all" | MoveType>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (day) {
        const local = new Date(item.at);
        const iso = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
        if (iso !== day) return false;
      }
      if (!q) return true;
      const hay = [
        formatMoveDate(item.at),
        formatMoveDay(item.at),
        typeLabel(item.type),
        item.ref,
        item.product,
        item.by,
        String(item.qty),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, day, type]);

  return (
    <section className="histo-page">
      <header className="histo-head">
        <div>
          <h1>Historique</h1>
          <p>Toutes les entrées, sorties, retours et inventaires, par date.</p>
        </div>
        <div className="histo-tools">
          <label className="histo-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une date, une réf, un produit…"
            />
          </label>
          <label className="histo-date">
            <CalendarIcon />
            <input
              type="date"
              value={day}
              aria-label="Filtrer par date"
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
        </div>
      </header>

      <div className="histo-filters" role="tablist" aria-label="Type de mouvement">
        {(["all", "entree", "sortie", "retour", "inventaire"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={type === id}
            className={type === id ? "on" : undefined}
            onClick={() => setType(id)}
          >
            {id === "all" ? "Tous" : typeLabel(id)}
          </button>
        ))}
      </div>

      <section className="histo-card">
        {filtered.length === 0 ? (
          <p className="histo-empty">Aucun mouvement ne correspond à cette date ou recherche.</p>
        ) : (
          <div className="histo-table-wrap">
            <table className="histo-table">
              <thead>
                <tr>
                  <th><CalendarIcon /> Date</th>
                  <th><TagIcon /> Type</th>
                  <th><HashIcon /> Réf</th>
                  <th><BoxIcon /> Produit</th>
                  <th><HashIcon /> Qté</th>
                  <th><UserIcon /> Par</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{formatMoveDate(item.at)}</td>
                    <td>
                      <em className={`histo-type ${item.type}`}>{typeLabel(item.type)}</em>
                    </td>
                    <td className="histo-ref">{item.ref}</td>
                    <td>{item.product}</td>
                    <td>
                      <b className={item.qty >= 0 ? "plus" : "minus"}>
                        {item.qty > 0 ? `+${item.qty}` : item.qty}
                      </b>
                    </td>
                    <td>
                      <span className={`histo-who ${item.actor}`}>{item.by}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function Stroke({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Stroke>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" />
    </Stroke>
  );
}

function CalendarIcon() {
  return (
    <Stroke>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 10h16" />
    </Stroke>
  );
}

function TagIcon() {
  return (
    <Stroke>
      <path d="M4 12 12 4h7v7l-8 8-7-7z" />
      <circle cx="16.2" cy="7.8" r="0.8" />
    </Stroke>
  );
}

function BoxIcon() {
  return (
    <Stroke>
      <path d="M4 8.2 12 4l8 4.2V20H4V8.2z" />
      <path d="M4 8.2 12 12.4 20 8.2" />
    </Stroke>
  );
}

function HashIcon() {
  return (
    <Stroke>
      <path d="M10 5 8 19" />
      <path d="M16 5l-2 14" />
      <path d="M5 9h15" />
      <path d="M4 15h15" />
    </Stroke>
  );
}

function UserIcon() {
  return (
    <Stroke>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c.6-3 3.2-4.6 6.5-4.6S17.9 16 18.5 19" />
    </Stroke>
  );
}

void 0 as unknown as Movement;
