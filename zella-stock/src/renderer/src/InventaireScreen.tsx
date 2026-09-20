import { useMemo, useState } from "react";
import escarpin from "./assets/watch-escarpin.png";
import seau from "./assets/watch-seau.png";
import valise from "./assets/watch-valise.png";
import sac from "./assets/watch-sac.png";
import { applyStockDelta } from "./catalog";
import { logMovement, productLine } from "./movements";

type Category = "Chaussures" | "Maroquinerie" | "Bagage";

type CountRow = {
  id: string;
  ref: string;
  name: string;
  variant: string;
  category: Category;
  logiciel: number;
  photo: string;
};

const SEED: CountRow[] = [
  { id: "1", ref: "ZL-ESC-12", name: "Escarpin", variant: "Noir 39", category: "Chaussures", logiciel: 0, photo: escarpin },
  { id: "2", ref: "ZL-ESC-12", name: "Escarpin", variant: "Noir 40", category: "Chaussures", logiciel: 2, photo: escarpin },
  { id: "3", ref: "ZL-SAC-08", name: "Mini seau", variant: "Noir", category: "Maroquinerie", logiciel: 4, photo: seau },
  { id: "4", ref: "ZL-VAL-03", name: "Valise beige", variant: "Grande", category: "Bagage", logiciel: 1, photo: valise },
  { id: "5", ref: "ZL-SAC-02", name: "Mini Sac Élégance", variant: "Noir", category: "Maroquinerie", logiciel: 3, photo: sac },
];

const INITIAL_SHOP: Record<string, string> = {
  "1": "0",
  "2": "1",
  "3": "4",
  "4": "2",
  "5": "3",
};

type Props = {
  actor?: string;
};

export function InventaireScreen({ actor = "Admin" }: Props) {
  const [rows, setRows] = useState(SEED);
  const [shop, setShop] = useState<Record<string, string>>(INITIAL_SHOP);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [notice, setNotice] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.variant.toLowerCase().includes(q) ||
        item.ref.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [rows, query, category]);

  function gap(item: CountRow) {
    const counted = Number(shop[item.id]);
    if (!Number.isFinite(counted)) return 0;
    return counted - item.logiciel;
  }

  function validate() {
    const next = rows.map((item) => {
      const counted = Number(shop[item.id]);
      const magasin = Number.isFinite(counted) && counted >= 0 ? counted : item.logiciel;
      const delta = magasin - item.logiciel;
      if (delta !== 0) {
        applyStockDelta(item.ref, delta);
        logMovement({
          type: "inventaire",
          ref: item.ref,
          product: productLine(item.name, item.variant) + ` · ${item.category}`,
          qty: delta,
          by: "Inventaire",
          actor: "outline",
        });
      }
      return { ...item, logiciel: magasin };
    });
    setRows(next);
    setShop(Object.fromEntries(next.map((item) => [item.id, String(item.logiciel)])));
    const changes = next.filter((item, index) => item.logiciel !== rows[index].logiciel).length;
    setNotice(
      changes === 0
        ? "Aucun écart à valider."
        : `Inventaire validé par ${actor} : ${changes} écart${changes > 1 ? "s" : ""} enregistré${changes > 1 ? "s" : ""} dans l’historique.`,
    );
  }

  return (
    <section className="inv-page">
      <header className="inv-head">
        <div>
          <h1>Inventaire</h1>
          <p>Comptage magasin vs logiciel</p>
        </div>
        <div className="inv-tools">
          <label className="inv-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un produit, une réf…"
            />
          </label>
          <label className="inv-cat">
            <span>Catégorie</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as "all" | Category)}>
              <option value="all">Toutes</option>
              <option value="Chaussures">Chaussures</option>
              <option value="Maroquinerie">Maroquinerie</option>
              <option value="Bagage">Bagage</option>
            </select>
          </label>
        </div>
      </header>

      <section className="inv-card">
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Variante</th>
                <th>Logiciel</th>
                <th>Magasin</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const delta = gap(item);
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="inv-product">
                        <img src={item.photo} alt="" />
                        <strong>{item.name}</strong>
                      </span>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.variant}</td>
                    <td>{item.logiciel}</td>
                    <td>
                      <input
                        inputMode="numeric"
                        aria-label={`Comptage magasin ${item.name} ${item.variant}`}
                        value={shop[item.id] ?? ""}
                        onChange={(event) =>
                          setShop((current) => ({ ...current, [item.id]: event.target.value.replace(/[^\d]/g, "") }))
                        }
                      />
                    </td>
                    <td>
                      <b className={delta < 0 ? "down" : delta > 0 ? "up" : "flat"}>
                        {delta > 0 ? `+${delta}` : delta}
                      </b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="inv-empty">Aucun article dans cette catégorie.</p> : null}
      </section>

      {notice ? <p className="inv-notice">{notice}</p> : null}

      <button type="button" className="inv-submit" onClick={validate}>
        Valider l’inventaire
      </button>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" />
    </svg>
  );
}
