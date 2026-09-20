import { useMemo, useState, type ReactNode } from "react";
import escarpin from "./assets/watch-escarpin.png";
import seau from "./assets/watch-seau.png";
import valise from "./assets/watch-valise.png";
import sac from "./assets/watch-sac.png";
import { formatPrice } from "./catalog";

type ValueRow = {
  name: string;
  photo: string;
  cost: number;
  price: number;
  qty: number;
};

const ROWS: ValueRow[] = [
  { name: "Escarpin", photo: escarpin, cost: 4200, price: 11900, qty: 25 },
  { name: "Mini seau", photo: seau, cost: 7500, price: 18700, qty: 18 },
  { name: "Valise beige", photo: valise, cost: 18000, price: 42000, qty: 12 },
  { name: "Mini Sac Élégance", photo: sac, cost: 6200, price: 16800, qty: 14 },
];

function compactMoney(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M DA`;
  }
  if (value >= 10_000) {
    return `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(value)} DA`;
  }
  return formatPrice(value);
}

export function ValorisationScreen() {
  const [day, setDay] = useState("2024-05-23");

  const dateLabel = useMemo(() => {
    const date = new Date(`${day}T12:00:00`);
    if (Number.isNaN(date.getTime())) return day;
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }, [day]);

  const totals = useMemo(() => {
    return ROWS.reduce(
      (acc, item) => {
        acc.sale += item.price * item.qty;
        acc.cost += item.cost * item.qty;
        return acc;
      },
      { sale: 0, cost: 0 },
    );
  }, []);

  const margin = totals.sale - totals.cost;

  return (
    <section className="valo-page">
      <header className="valo-head">
        <div>
          <h1>Valorisation</h1>
          <p>Aperçu de la valeur du stock et de la marge estimée.</p>
        </div>
        <label className="valo-date">
          <CalendarIcon />
          <span>{dateLabel}</span>
          <input type="date" value={day} aria-label="Date de valorisation" onChange={(event) => setDay(event.target.value)} />
        </label>
      </header>

      <div className="valo-kpis">
        <article className="valo-kpi">
          <span className="valo-kpi-ico">
            <BagIcon />
          </span>
          <div>
            <p>Valeur vente</p>
            <strong>{compactMoney(totals.sale)}</strong>
          </div>
        </article>
        <article className="valo-kpi">
          <span className="valo-kpi-ico">
            <CoinsIcon />
          </span>
          <div>
            <p>Coût</p>
            <strong>{compactMoney(totals.cost)}</strong>
          </div>
        </article>
        <article className="valo-kpi glow">
          <span className="valo-kpi-ico">
            <TrendIcon />
          </span>
          <div>
            <p>Marge estimée</p>
            <strong>{compactMoney(margin)}</strong>
          </div>
        </article>
      </div>

      <section className="valo-card">
        <table className="valo-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix achat</th>
              <th>Prix vente</th>
              <th>Qté</th>
              <th>Marge</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((item) => (
              <tr key={item.name}>
                <td>
                  <span className="valo-product">
                    <img src={item.photo} alt="" />
                    <strong>{item.name}</strong>
                  </span>
                </td>
                <td>{formatPrice(item.cost)}</td>
                <td>{formatPrice(item.price)}</td>
                <td>{item.qty}</td>
                <td>
                  <b>{formatPrice((item.price - item.cost) * item.qty)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function CalendarIcon() {
  return (
    <Stroke>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 4v4M16 4v4M4 10h16" />
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

function CoinsIcon() {
  return (
    <Stroke>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v4c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 11v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
    </Stroke>
  );
}

function TrendIcon() {
  return (
    <Stroke>
      <path d="M4 16 10 10l4 4 6-8" />
      <path d="M15 6h5v5" />
    </Stroke>
  );
}
