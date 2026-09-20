import { useMemo, useState, type ReactNode } from "react";
import type { Page } from "./App";
import escarpin from "./assets/watch-escarpin.png";
import seau from "./assets/watch-seau.png";
import valise from "./assets/watch-valise.png";
import sac from "./assets/watch-sac.png";

type Status = "rupture" | "bas";
type Filter = "all" | Status;

type AlertRow = {
  id: string;
  name: string;
  variant: string;
  qty: number;
  status: Status;
  photo: string;
};

type Props = {
  roleLabel: string;
  onNavigate: (page: Page) => void;
};

const ALERTS: AlertRow[] = [
  { id: "r1", name: "Escarpin satin", variant: "Noir 39", qty: 0, status: "rupture", photo: escarpin },
  { id: "b1", name: "Mini seau", variant: "Noir 36", qty: 2, status: "bas", photo: seau },
  { id: "b2", name: "Valise beige", variant: "Grande", qty: 1, status: "bas", photo: valise },
  { id: "r2", name: "Escarpin satin", variant: "Noir 36", qty: 0, status: "rupture", photo: escarpin },
  { id: "b3", name: "Escarpin satin", variant: "Noir 40", qty: 2, status: "bas", photo: escarpin },
  { id: "r3", name: "Escarpin satin", variant: "Nude 38", qty: 0, status: "rupture", photo: escarpin },
  { id: "b4", name: "Mini Sac Élégance", variant: "Noir", qty: 3, status: "bas", photo: sac },
  { id: "r4", name: "Mini seau", variant: "Champagne", qty: 0, status: "rupture", photo: seau },
  { id: "r5", name: "Mini Sac Élégance", variant: "Or", qty: 0, status: "rupture", photo: sac },
  { id: "b5", name: "Valise beige", variant: "Beige Cabine", qty: 2, status: "bas", photo: valise },
  { id: "r6", name: "Valise beige", variant: "Cabine", qty: 0, status: "rupture", photo: valise },
  { id: "r7", name: "Escarpin satin", variant: "Noir 41", qty: 0, status: "rupture", photo: escarpin },
  { id: "b6", name: "Mini seau", variant: "Champagne Unique", qty: 1, status: "bas", photo: seau },
  { id: "r8", name: "Mini seau", variant: "Noir Unique", qty: 0, status: "rupture", photo: seau },
  { id: "r9", name: "Mini Sac Élégance", variant: "Bordeaux", qty: 0, status: "rupture", photo: sac },
  { id: "b7", name: "Escarpin satin", variant: "Noir 37", qty: 2, status: "bas", photo: escarpin },
  { id: "r10", name: "Valise beige", variant: "Moyenne", qty: 0, status: "rupture", photo: valise },
  { id: "r11", name: "Escarpin satin", variant: "Ivoire 37", qty: 0, status: "rupture", photo: escarpin },
  { id: "r12", name: "Mini seau", variant: "Or Unique", qty: 0, status: "rupture", photo: seau },
];

export function AlertesScreen({ roleLabel, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const ruptures = ALERTS.filter((item) => item.status === "rupture").length;
  const bas = ALERTS.filter((item) => item.status === "bas").length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALERTS.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.variant.toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <section className="alertes-page">
      <header className="alertes-head">
        <h1>Alertes</h1>
        <div className="alertes-tools">
          <label className="alertes-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un produit..."
            />
          </label>
          <span className="alertes-avatar" aria-hidden>
            ZL
          </span>
        </div>
      </header>

      <div className="alertes-kpis">
        <button
          type="button"
          className={filter === "rupture" ? "alertes-kpi rupture on" : "alertes-kpi rupture"}
          onClick={() => setFilter((current) => (current === "rupture" ? "all" : "rupture"))}
        >
          <span className="alertes-kpi-ico">
            <BagIcon />
          </span>
          <span className="alertes-kpi-copy">
            <strong>{ruptures}</strong>
            <em>Ruptures</em>
          </span>
        </button>
        <button
          type="button"
          className={filter === "bas" ? "alertes-kpi bas on" : "alertes-kpi bas"}
          onClick={() => setFilter((current) => (current === "bas" ? "all" : "bas"))}
        >
          <span className="alertes-kpi-ico">
            <BoxIcon />
          </span>
          <span className="alertes-kpi-copy">
            <strong>{bas}</strong>
            <em>Stock bas</em>
          </span>
        </button>
      </div>

      <section className="alertes-card">
        {rows.length === 0 ? (
          <p className="alertes-empty">Aucune alerte ne correspond à votre recherche.</p>
        ) : (
          <div className="alertes-table-wrap">
            <table className="alertes-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Variante</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="alertes-product">
                        <img src={item.photo} alt="" />
                        <strong>{item.name}</strong>
                      </span>
                    </td>
                    <td>{item.variant}</td>
                    <td>
                      <b className={`alertes-qty ${item.status}`}>{item.qty}</b>
                    </td>
                    <td>
                      <em className={`alertes-badge ${item.status}`}>
                        {item.status === "rupture" ? "Rupture" : "Stock bas"}
                      </em>
                    </td>
                    <td>
                      <button type="button" className="alertes-reassort" onClick={() => onNavigate("entree")}>
                        Réassort
                      </button>
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

function BagIcon() {
  return (
    <Stroke>
      <path d="M7 8V7a5 5 0 0 1 10 0v1" />
      <path d="M5.5 8h13l-.8 12.2a1.6 1.6 0 0 1-1.6 1.5H7.9a1.6 1.6 0 0 1-1.6-1.5L5.5 8z" />
    </Stroke>
  );
}

function BoxIcon() {
  return (
    <Stroke>
      <path d="M4 8.2 12 4l8 4.2V20H4V8.2z" />
      <path d="M4 8.2 12 12.4 20 8.2" />
      <path d="M12 12.4V20" />
    </Stroke>
  );
}
