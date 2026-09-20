import { useMemo, useState, type ReactNode } from "react";
import type { Page } from "./App";
import escarpin from "./assets/watch-escarpin.png";
import sac from "./assets/watch-sac.png";
import valise from "./assets/watch-valise.png";

type Period = "today" | "week" | "month";
type Status = "rupture" | "bas" | "ok";
type MoveKind = "Entrée" | "Sortie";

type WatchItem = {
  name: string;
  ref: string;
  status: Status;
  photo: string;
  left: number;
};

type Movement = {
  kind: MoveKind;
  product: string;
  qty: number;
  when: string;
  user: string;
};

const WATCH: WatchItem[] = [
  { name: "Escarpin Divina", ref: "ESC-DIV-001", status: "rupture", photo: escarpin, left: 0 },
  { name: "Mini Sac Élégance", ref: "SAC-MIN-002", status: "bas", photo: sac, left: 3 },
  { name: "Valise Prestige", ref: "VAL-PRE-003", status: "ok", photo: valise, left: 25 },
];

const MOVES: Movement[] = [
  { kind: "Entrée", product: "Ceinture Tresse", qty: 6, when: "22/05 · 09:14", user: "Admin" },
  { kind: "Sortie", product: "Escarpin Divina", qty: -1, when: "22/05 · 11:02", user: "Salma" },
  { kind: "Sortie", product: "Mini Sac Élégance", qty: -2, when: "22/05 · 14:38", user: "Site" },
  { kind: "Entrée", product: "Valise Prestige", qty: 4, when: "21/05 · 16:20", user: "Admin" },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Aujourd’hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
];

const MIX = [
  { label: "En stock", value: 129, color: "#6A8F78" },
  { label: "Stock bas", value: 7, color: "#C9A86C" },
  { label: "Rupture", value: 12, color: "#65232B" },
];

type Props = {
  roleLabel: string;
  onNavigate: (page: Page) => void;
};

export function AccueilScreen({ onNavigate }: Props) {
  const [period, setPeriod] = useState<Period>("week");
  const charts = useMemo(() => chartData(period), [period]);

  return (
    <section className="dash">
      <div className="kpi-row">
        <KpiCard
          tone="gold"
          icon={<BagIcon />}
          label="Articles"
          value="148"
          hint="+6 cette semaine"
          spark={[140, 142, 141, 145, 144, 147, 148]}
        />
        <KpiCard
          tone="wine"
          icon={<BellIcon />}
          label="Alertes"
          value="7"
          hint="+2 vs. hier"
          spark={[4, 5, 5, 6, 5, 7, 7]}
        />
        <KpiCard
          tone="soft"
          icon={<WarnIcon />}
          label="Ruptures"
          value="12"
          hint="−1 vs. hier"
          spark={[14, 13, 13, 12, 13, 12, 12]}
        />
        <KpiCard
          tone="sage"
          icon={<SyncIcon />}
          label="Synchronisation"
          value="OK"
          hint="Il y a 4 min"
          spark={[1, 1, 1, 1, 1, 1, 1]}
        />
      </div>

      <div className="dash-mid">
        <section className="panel">
          <header className="panel-head">
            <h2>À surveiller</h2>
            <button type="button" className="text-link" onClick={() => onNavigate("alertes")}>
              Tout voir
            </button>
          </header>
          <ul className="watch-list">
            {WATCH.map((item) => (
              <li key={item.ref}>
                <img src={item.photo} alt="" />
                <div className="watch-meta">
                  <strong>{item.name}</strong>
                  <span>Réf. {item.ref}</span>
                </div>
                <b className="stock-n">{item.left}</b>
                <em className={`badge ${item.status}`}>
                  {item.status === "rupture" ? "Rupture" : item.status === "bas" ? "Stock bas" : "Disponible"}
                </em>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => onNavigate(item.status === "ok" ? "stock" : "entree")}
                >
                  {item.status === "ok" ? "Voir" : "Réappro."}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2>Actions rapides</h2>
          </header>
          <div className="quick-list">
            <button type="button" className="quick primary" onClick={() => onNavigate("entree")}>
              <span>+</span>
              Nouvelle entrée
            </button>
            <button type="button" className="quick" onClick={() => onNavigate("sortie")}>
              <span>+</span>
              Nouvelle sortie
            </button>
            <button type="button" className="quick" onClick={() => onNavigate("stock")}>
              <span>+</span>
              Ajouter un produit
            </button>
            <button type="button" className="quick" onClick={() => onNavigate("alertes")}>
              Voir les alertes
            </button>
          </div>
        </section>
      </div>

      <div className="dash-low">
        <section className="panel">
          <header className="panel-head">
            <h2>Derniers mouvements</h2>
          </header>
          <ul className="move-list">
            <li className="move-cols" aria-hidden>
              <span>Type</span>
              <span>Produit</span>
              <span>Quantité</span>
              <span>Date</span>
              <span>Utilisateur</span>
            </li>
            {MOVES.map((move) => (
              <li key={`${move.product}-${move.when}`} className={move.kind === "Entrée" ? "in" : "out"}>
                <span className="move-kind">
                  <span className="move-ico">{move.kind === "Entrée" ? <InIcon /> : <OutIcon />}</span>
                  {move.kind}
                </span>
                <strong>{move.product}</strong>
                <em className={move.qty > 0 ? "qty plus" : "qty minus"}>
                  {move.qty > 0 ? `+${move.qty}` : move.qty}
                </em>
                <span>{move.when}</span>
                <span>{move.user}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2>Aperçu du stock</h2>
          </header>
          <DonutChart slices={MIX} total={148} />
        </section>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Entrées vs sorties</h2>
          <div className="period" role="tablist" aria-label="Période">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={period === item.id}
                className={period === item.id ? "on" : ""}
                onClick={() => setPeriod(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flow-legend">
          <span><i className="key-in" /> Entrées</span>
          <span><i className="key-out" /> Sorties</span>
        </div>
        <BarChart ins={charts.ins} outs={charts.outs} labels={charts.labels} />
      </section>
    </section>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
  spark,
}: {
  tone: "gold" | "wine" | "soft" | "sage";
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  spark: number[];
}) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-ico">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <div className="kpi-foot">
        <em>{hint}</em>
        <Sparkline values={spark} />
      </div>
    </article>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 72;
  const h = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const xs = values.map((_, i) => (i * w) / Math.max(values.length - 1, 1));
  const ys = values.map((v) => h - 3 - ((v - min) / span) * (h - 6));
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden>
      <path className="spark-fill" d={area} />
      <path className="spark-line" d={d} />
    </svg>
  );
}

function chartData(period: Period) {
  if (period === "today") {
    return { labels: ["8h", "11h", "14h", "17h", "20h"], ins: [2, 0, 4, 1, 0], outs: [1, 3, 2, 2, 1] };
  }
  if (period === "month") {
    return { labels: ["S1", "S2", "S3", "S4"], ins: [18, 12, 22, 16], outs: [14, 19, 15, 21] };
  }
  return {
    labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    ins: [4, 6, 3, 8, 5, 2, 1],
    outs: [3, 2, 5, 4, 6, 3, 2],
  };
}

function BarChart({ ins, outs, labels }: { ins: number[]; outs: number[]; labels: string[] }) {
  const max = Math.max(...ins, ...outs, 1);
  const w = 640;
  const h = 188;
  const gap = 12;
  const group = (w - 24) / labels.length;
  const bar = Math.max(7, (group - gap) / 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Entrées et sorties">
      {[0.25, 0.5, 0.75, 1].map((n) => (
        <line key={n} x1="8" x2={w - 8} y1={10 + (h - 34) * (1 - n)} y2={10 + (h - 34) * (1 - n)} />
      ))}
      {labels.map((label, i) => {
        const x = 16 + i * group;
        const inH = (ins[i] / max) * (h - 42);
        const outH = (outs[i] / max) * (h - 42);
        return (
          <g key={label}>
            <rect className="bar-in" x={x} y={h - 22 - inH} width={bar} height={inH} rx="3" />
            <rect className="bar-out" x={x + bar + 4} y={h - 22 - outH} width={bar} height={outH} rx="3" />
            <text x={x + bar} y={h - 6}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ slices, total }: { slices: { label: string; value: number; color: string }[]; total: number }) {
  const sum = slices.reduce((n, s) => n + s.value, 0);
  const r = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} className="donut-track" />
        {slices.map((slice) => {
          const len = (slice.value / sum) * c;
          const el = (
            <circle
              key={slice.label}
              cx="60"
              cy="60"
              r={r}
              stroke={slice.color}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
        <text x="60" y="56">{total}</text>
        <text x="60" y="72" className="donut-sub">total</text>
      </svg>
      <ul>
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <b>{slice.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M7 8V7a5 5 0 0 1 10 0v1" />
      <path d="M5 8h14l-1.2 12.2A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-2-1.8L5 8z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M6.2 16h11.6l-1.5-2.6V9.2a4.3 4.3 0 0 0-8.6 0v4.2L6.2 16z" />
      <path d="M10 18.4a2 2 0 0 0 4 0" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 4 21 20H3L12 4z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="17.4" r="0.7" fill="currentColor" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M20 6.5A8 8 0 0 0 6.2 8.4" />
      <path d="M20 6.5V11h-4.4" />
      <path d="M4 17.5A8 8 0 0 0 17.8 15.6" />
      <path d="M4 17.5V13h4.4" />
    </svg>
  );
}

function InIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function OutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 20V9" />
      <path d="M7.5 13.5 12 9l4.5 4.5" />
      <path d="M5 4h14" />
    </svg>
  );
}
