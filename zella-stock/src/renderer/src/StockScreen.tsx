import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import type { Page } from "./App";
import { AddProductModal } from "./AddProductModal";
import {
  formatPrice,
  listCatalog,
  stockStatus,
  subscribeCatalog,
  type CatalogProduct,
  type StockStatus,
} from "./catalog";
import { publishToSite, unpublishFromSite } from "./site-publish";

type ViewMode = "table" | "grid";

type Props = {
  roleLabel: string;
  roleDetail: string;
  onNavigate: (page: Page) => void;
};

const STATUS_LABEL: Record<StockStatus, string> = {
  rupture: "Rupture",
  bas: "Stock bas",
  ok: "OK",
};

const STATUSES: { id: "all" | StockStatus; label: string }[] = [
  { id: "all", label: "Tous les états" },
  { id: "ok", label: "OK" },
  { id: "bas", label: "Stock bas" },
  { id: "rupture", label: "Rupture" },
];

export function StockScreen({ roleLabel, roleDetail, onNavigate }: Props) {
  const catalog = useSyncExternalStore(subscribeCatalog, listCatalog, listCatalog);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [view, setView] = useState<ViewMode>("table");
  const [selected, setSelected] = useState<string | null>(null);
  const [ficheRef, setFicheRef] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [openSelect, setOpenSelect] = useState<"category" | "status" | "filter" | null>(null);
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState("");
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDoc = (event: globalThis.MouseEvent) => {
      if (!pageRef.current?.contains(event.target as Node)) setOpenSelect(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!ficheRef && !addOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFicheRef(null);
        setAddOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ficheRef, addOpen]);

  const categories = useMemo(() => {
    const names = [...new Set(catalog.map((item) => item.category))];
    return [{ id: "all", label: "Toutes les catégories" }, ...names.map((name) => ({ id: name, label: name }))];
  }, [catalog]);

  const variantAlerts = useMemo(() => {
    return catalog.flatMap((product) =>
      product.variants.map((variant) => ({
        key: `${product.ref}-${variant.color}-${variant.size}`,
        product,
        variant,
        status: stockStatus(variant.qty, product.minStock),
      })),
    );
  }, [catalog]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (status !== "all" && !product.variants.some((variant) => stockStatus(variant.qty, product.minStock) === status)) {
        return false;
      }
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.ref.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.colors.some((color) => color.toLowerCase().includes(q)) ||
        product.sizes.some((size) => size.toLowerCase().includes(q))
      );
    });
  }, [catalog, query, category, status]);

  const kpis = useMemo(() => {
    const products = catalog.length;
    const total = catalog.reduce((sum, item) => sum + item.stock, 0);
    const rupture = variantAlerts.filter((row) => row.status === "rupture").length;
    const bas = variantAlerts.filter((row) => row.status === "bas").length;
    return { products, total, rupture, bas };
  }, [catalog, variantAlerts]);

  const fiche = catalog.find((item) => item.ref === ficheRef) ?? null;
  const categoryLabel = categories.find((item) => item.id === category)?.label ?? "Catégorie";
  const statusLabel = STATUSES.find((item) => item.id === status)?.label ?? "État";

  function openFiche(ref: string) {
    setSelected(ref);
    setFicheRef(ref);
    setOpenSelect(null);
  }

  async function togglePublish(event: MouseEvent, product: CatalogProduct) {
    event.stopPropagation();
    setBusyRef(product.ref);
    setPublishNotice("");
    try {
      if (product.published) {
        await unpublishFromSite(product.ref);
        setPublishNotice(`${product.name} a été retiré du site. Il reste dans Zella Stock.`);
      } else {
        await publishToSite(product.ref);
        setPublishNotice(`${product.name} est publié sur le site Zella Luxe.`);
      }
    } catch (error) {
      setPublishNotice(error instanceof Error ? error.message : "La synchronisation avec le site a échoué.");
    } finally {
      setBusyRef(null);
    }
  }

  return (
    <section className="stock-page" ref={pageRef} onClick={() => setOpenSelect(null)}>
      <header className="stock-head">
        <div className="stock-head-copy">
          <h1>Stock</h1>
          <p>Gérez et suivez votre inventaire</p>
        </div>
        <label className="stock-search stock-search-wide">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une référence, un nom ou une variante…"
            onClick={(event) => event.stopPropagation()}
          />
        </label>
        <div className="stock-tools">
          <button type="button" className="stock-icon-btn" aria-label="Notifications" onClick={() => onNavigate("alertes")}>
            <BellIcon />
            <i>{kpis.rupture + kpis.bas}</i>
          </button>
          <button type="button" className="stock-profile" onClick={() => onNavigate("parametres")}>
            <span className="avatar">{roleLabel[0]}</span>
            <span>
              {roleLabel}
              <small>{roleDetail}</small>
            </span>
          </button>
          <button type="button" className="stock-entry" onClick={() => setAddOpen(true)}>
            + Ajouter un produit
          </button>
        </div>
      </header>

      <div className="stock-kpis">
        <Kpi icon={<BoxIcon />} label="Total produits" value={String(kpis.products)} hint="Références" />
        <Kpi icon={<StackIcon />} label="Stock total" value={String(kpis.total)} hint="Articles" />
        <Kpi icon={<AlertIcon />} label="Rupture" value={String(kpis.rupture)} hint="Variantes" tone="wine" />
        <Kpi icon={<LowIcon />} label="Stock bas" value={String(kpis.bas)} hint="Variantes" tone="gold" />
      </div>

      <div className="stock-body">
        <section className="stock-panel">
          <div className="stock-panel-bar">
            <div className="stock-panel-title">
              <h2>Tableau</h2>
              <span>{rows.length} produit{rows.length > 1 ? "s" : ""}</span>
            </div>
            <div className="stock-controls">
              <div className="stock-select">
                <button
                  type="button"
                  className={openSelect === "filter" ? "stock-chip open" : "stock-chip"}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenSelect((current) => (current === "filter" ? null : "filter"));
                  }}
                >
                  <FilterIcon />
                  Filtres
                </button>
                {openSelect === "filter" ? (
                  <div className="stock-menu" onClick={(event) => event.stopPropagation()}>
                    {STATUSES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={status === item.id ? "on" : undefined}
                        onClick={() => { setStatus(item.id); setOpenSelect(null); }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <DropSelect
                open={openSelect === "category"}
                label={category === "all" ? "Catégorie" : categoryLabel}
                options={categories}
                value={category}
                onToggle={() => setOpenSelect((current) => (current === "category" ? null : "category"))}
                onPick={(id) => { setCategory(id); setOpenSelect(null); }}
              />
              <DropSelect
                open={openSelect === "status"}
                label={status === "all" ? "État" : statusLabel}
                options={STATUSES}
                value={status}
                onToggle={() => setOpenSelect((current) => (current === "status" ? null : "status"))}
                onPick={(id) => { setStatus(id); setOpenSelect(null); }}
              />
              <div className="stock-views" role="group" aria-label="Affichage">
                <button type="button" className={view === "table" ? "on" : undefined} aria-label="Vue tableau" onClick={() => setView("table")}>
                  <TableIcon />
                </button>
                <button type="button" className={view === "grid" ? "on" : undefined} aria-label="Vue grille" onClick={() => setView("grid")}>
                  <GridIcon />
                </button>
              </div>
            </div>
          </div>

          {publishNotice ? <p className="stock-publish-notice">{publishNotice}</p> : null}
          {rows.length === 0 ? (
            <p className="stock-empty">Aucun produit ne correspond à votre recherche.</p>
          ) : view === "grid" ? (
            <ul className="stock-grid">
              {rows.map((item) => (
                <li key={item.ref}>
                  <button
                    type="button"
                    className={selected === item.ref ? "stock-card on" : "stock-card"}
                    onClick={() => openFiche(item.ref)}
                  >
                    <img src={item.photo} alt="" />
                    <strong>{item.name}</strong>
                    <span>{item.ref}</span>
                    <em>{orderedSizes(item.sizes).join(" · ")}</em>
                    <div className="stock-card-foot">
                      <b>{item.stock}</b>
                      <StatusDot status={stockStatus(item.stock, item.minStock)} />
                    </div>
                    <PublishState published={item.published} />
                  </button>
                  <PublishButton product={item} busy={busyRef === item.ref} onToggle={togglePublish} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table stock-table-wide">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Réf.</th>
                    <th>Couleurs</th>
                    <th>Tailles disponibles</th>
                    <th>Stock</th>
                    <th>Seuil</th>
                    <th>Prix achat</th>
                    <th>Prix vente</th>
                    <th>Statut</th>
                    <th>Site</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => {
                    const status = stockStatus(product.stock, product.minStock);
                    return (
                    <tr
                      key={product.ref}
                      className={selected === product.ref ? "on" : undefined}
                      onClick={() => openFiche(product.ref)}
                    >
                      <td>
                        <span className="stock-product">
                          <img src={product.photo} alt="" />
                          <strong>{product.name}</strong>
                        </span>
                      </td>
                      <td>{product.ref}</td>
                      <td>
                        <ColorList colors={product.colors} />
                      </td>
                      <td>{orderedSizes(product.sizes).join(" · ")}</td>
                      <td>
                        <b className={`stock-qty ${status}`}>{product.stock}</b>
                      </td>
                      <td>{product.minStock}</td>
                      <td>{formatPrice(product.cost)}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>
                        <StatusDot status={status} />
                      </td>
                      <td>
                        <PublishState published={product.published} />
                      </td>
                      <td className="stock-publish-cell">
                        <PublishButton product={product} busy={busyRef === product.ref} onToggle={togglePublish} />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {fiche ? <VariantMatrix product={fiche} onClose={() => setFicheRef(null)} /> : null}
      {addOpen ? <AddProductModal onClose={() => setAddOpen(false)} /> : null}
    </section>
  );
}

function VariantMatrix({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const sizes = orderedSizes(product.sizes);
  const colors = product.colors;
  const colTotals = sizes.map((size) =>
    colors.reduce((sum, color) => sum + (variantQty(product, color, size) ?? 0), 0),
  );

  return (
    <div className="fiche-overlay" onClick={onClose}>
      <article className="fiche fiche-matrix" onClick={(event) => event.stopPropagation()} aria-label={`${product.name} — ${product.ref}`}>
        <header className="fiche-head">
          <div>
            <h2>{product.name} — {product.ref}</h2>
          </div>
          <button type="button" className="fiche-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>

        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Couleur ↓ / Taille →</th>
                {sizes.map((size) => (
                  <th key={size}>{size}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => {
                const rowTotal = sizes.reduce((sum, size) => sum + (variantQty(product, color, size) ?? 0), 0);
                return (
                  <tr key={color}>
                    <th>
                      <ColorMark color={color} />
                    </th>
                    {sizes.map((size) => {
                      const qty = variantQty(product, color, size);
                      if (qty == null) return <td key={size} className="empty">—</td>;
                      return (
                        <td key={size}>
                          <b className={`stock-qty ${stockStatus(qty, product.minStock)}`}>{qty}</b>
                        </td>
                      );
                    })}
                    <td><b>{rowTotal}</b></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                {colTotals.map((total, index) => (
                  <td key={sizes[index]}><b>{total}</b></td>
                ))}
                <td><b>{product.stock}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </div>
  );
}

function ColorList({ colors }: { colors: string[] }) {
  return (
    <span className="color-list">
      {colors.map((color, index) => (
        <span key={color}>
          {index > 0 ? <i className="color-sep">·</i> : null}
          <ColorMark color={color} />
        </span>
      ))}
    </span>
  );
}

function ColorMark({ color }: { color: string }) {
  return (
    <span className="color-mark">
      <i style={{ background: colorHex(color) }} />
      {color}
    </span>
  );
}

function orderedSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return na - nb;
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b, "fr");
  });
}

function variantQty(product: CatalogProduct, color: string, size: string) {
  const variant = product.variants.find((item) => item.color === color && item.size === size);
  return variant ? variant.qty : undefined;
}

function colorHex(name: string) {
  const map: Record<string, string> = {
    noir: "#1c1c1c",
    beige: "#c4a574",
    champagne: "#e8d5a3",
    bordeaux: "#6b1d2a",
    or: "#c9a86c",
    blanc: "#f4efe6",
    nude: "#d4b49a",
  };
  return map[name.toLowerCase()] ?? "#8a8078";
}

function Kpi({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint: string; tone?: "wine" | "gold" }) {
  return (
    <article className={tone ? `stock-kpi ${tone}` : "stock-kpi"}>
      <span className="stock-kpi-ico">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function StatusDot({ status }: { status: StockStatus }) {
  return (
    <em className={`stock-dot ${status}`} title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]}>
      <i />
    </em>
  );
}

function PublishState({ published }: { published: boolean }) {
  return (
    <span className={published ? "stock-site on" : "stock-site"}>
      <i />
      {published ? "Publié sur le site" : "Non publié sur le site"}
    </span>
  );
}

function PublishButton({
  product,
  busy,
  onToggle,
}: {
  product: CatalogProduct;
  busy: boolean;
  onToggle: (event: MouseEvent, product: CatalogProduct) => void;
}) {
  return (
    <button
      type="button"
      className={product.published ? "stock-unpublish" : "stock-publish"}
      disabled={busy}
      onClick={(event) => onToggle(event, product)}
    >
      {busy ? "…" : product.published ? "Retirer du site" : "Publier sur le site"}
    </button>
  );
}

function DropSelect<T extends string>({
  open,
  label,
  options,
  value,
  onToggle,
  onPick,
}: {
  open: boolean;
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onToggle: () => void;
  onPick: (id: T) => void;
}) {
  return (
    <div className="stock-select">
      <button
        type="button"
        className={open ? "stock-chip open" : "stock-chip"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        {label}
        <CaretIcon />
      </button>
      {open ? (
        <div className="stock-menu" onClick={(event) => event.stopPropagation()}>
          {options.map((item) => (
            <button key={item.id} type="button" className={value === item.id ? "on" : undefined} onClick={() => onPick(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stroke({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function BellIcon() {
  return (
    <Stroke>
      <path d="M6.2 16h11.6l-1.5-2.6V9.2a4.3 4.3 0 0 0-8.6 0v4.2L6.2 16z" />
      <path d="M10 18.4a2 2 0 0 0 4 0" />
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

function StackIcon() {
  return (
    <Stroke>
      <path d="M4 8 12 4l8 4-8 4-8-4z" />
      <path d="M4 12 12 16l8-4" />
      <path d="M4 16 12 20l8-4" />
    </Stroke>
  );
}

function AlertIcon() {
  return (
    <Stroke>
      <path d="M12 4 3.8 19h16.4L12 4z" />
      <path d="M12 10v5" />
      <path d="M12 17.2h.01" />
    </Stroke>
  );
}

function LowIcon() {
  return (
    <Stroke>
      <path d="M5 16h14" />
      <path d="M8 16V9" />
      <path d="M12 16V7" />
      <path d="M16 16v-3" />
    </Stroke>
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

function FilterIcon() {
  return (
    <Stroke>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </Stroke>
  );
}

function CaretIcon() {
  return (
    <Stroke>
      <path d="M7 10l5 5 5-5" />
    </Stroke>
  );
}

function TableIcon() {
  return (
    <Stroke>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M10 5v14" />
    </Stroke>
  );
}

function GridIcon() {
  return (
    <Stroke>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </Stroke>
  );
}
