import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Page } from "./App";
import {
  addStock,
  findByRef,
  formatPrice,
  listCatalog,
  searchCatalog,
  subscribeCatalog,
  upsertProduct,
  type CatalogProduct,
} from "./catalog";
import { formatMoveDay, listMovements, logMovement, productLine, subscribeMovements } from "./movements";
import { addSupplier, listSuppliers, subscribeSuppliers } from "./suppliers";

const CATEGORIES = ["Chaussures", "Maroquinerie", "Bagage", "Accessoires", "Escarpins", "Sandales", "Sacs"];

type ManualDraft = { ref: string; name: string; category: string; price: string; colors: string; sizes: string; photo: string };
const EMPTY: ManualDraft = { ref: "", name: "", category: "Chaussures", price: "", colors: "", sizes: "", photo: "" };

export function EntreeScreen({ actor = "Admin", onNavigate }: { actor?: string; onNavigate?: (page: Page) => void }) {
  const catalog = useSyncExternalStore(subscribeCatalog, listCatalog, listCatalog);
  const movements = useSyncExternalStore(subscribeMovements, listMovements, listMovements);
  const suppliers = useSyncExternalStore(subscribeSuppliers, listSuppliers, listSuppliers);
  const [search, setSearch] = useState("");
  const [foundRef, setFoundRef] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [receivedAt, setReceivedAt] = useState(todayInput);
  const [invoice, setInvoice] = useState("");
  const [note, setNote] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<ManualDraft>(EMPTY);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [bulk, setBulk] = useState(false);
  const [bulkQty, setBulkQty] = useState<Record<string, string>>({});
  const [openSuggest, setOpenSuggest] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoop = useRef(0);
  const qtyRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const found = catalog.find((item) => item.ref === foundRef) ?? null;
  const suggestions = search.trim() ? searchCatalog(search) : [];

  useEffect(() => () => stopScan(), []);
  useEffect(() => {
    const t = window.setTimeout(() => lookup(search), 160);
    return () => window.clearTimeout(t);
  }, [search]);

  function lookup(value: string) {
    const exact = findByRef(value) ?? searchCatalog(value).find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
    if (exact) {
      if (foundRef !== exact.ref) pick(exact, false);
      setUnknown(false);
      return;
    }
    if (foundRef && value.trim()) {
      setFoundRef(null);
      setColor("");
      setSize("");
    }
    setUnknown(Boolean(value.trim()) && searchCatalog(value).length === 0);
  }

  function pick(product: CatalogProduct, fill = true) {
    const first = product.variants[0];
    setFoundRef(product.ref);
    setColor(first?.color ?? product.colors[0] ?? "");
    setSize(first?.size ?? product.sizes[0] ?? "");
    setCost(String(product.cost || ""));
    setUnknown(false);
    setOpenSuggest(false);
    setBulkQty({});
    if (fill) setSearch(product.ref);
    setTimeout(() => qtyRef.current?.focus(), 40);
  }

  function applyCode(value: string) {
    const next = value.trim();
    setSearch(next.toUpperCase());
    const product = findByRef(next) ?? searchCatalog(next)[0];
    if (product) {
      pick(product);
      setNotice("");
      setSuccess("Produit sélectionné. Choisissez la variante puis la quantité.");
    } else {
      setFoundRef(null);
      setUnknown(Boolean(next));
    }
  }

  const currentQty = found ? cellQty(found, color, size) ?? 0 : 0;
  const amount = Number(qty);
  const unitCost = Number(cost);
  const lineTotal = amount > 0 && unitCost > 0 ? amount * unitCost : 0;
  const bulkLines = Object.entries(bulkQty)
    .map(([key, value]) => {
      const [c, s] = key.split("|");
      return { color: c, size: s, qty: Number(value) };
    })
    .filter((item) => item.qty > 0);
  const bulkCount = bulkLines.reduce((sum, item) => sum + item.qty, 0);
  const bulkValue = found ? bulkCount * (unitCost > 0 ? unitCost : found.cost) : 0;

  const kpis = useMemo(() => {
    const now = new Date();
    const entries = movements.filter((item) => item.type === "entree");
    const today = entries.filter((item) => sameDay(item.at, now)).reduce((sum, item) => sum + Math.abs(item.qty), 0);
    const monthRows = entries.filter((item) => sameMonth(item.at, now));
    return {
      today,
      month: monthRows.reduce((sum, item) => sum + Math.abs(item.qty), 0),
      value: monthRows.reduce((sum, item) => sum + Math.abs(item.qty) * (item.cost ?? findByRef(item.ref)?.cost ?? 0), 0),
      last: entries[0],
    };
  }, [movements, catalog]);

  const lastEntries = movements.filter((item) => item.type === "entree").slice(0, 6);

  function recordLine(product: CatalogProduct, c: string, s: string, q: number, unit: number) {
    addStock(product.ref, q, c, s);
    logMovement({
      type: "entree",
      ref: product.ref,
      product: productLine(product.name, c, s),
      qty: q,
      by: actor,
      actor: "gold",
      supplier: supplier || undefined,
      cost: unit,
      invoice: invoice.trim() || undefined,
      color: c,
      size: s,
      note: note.trim() || undefined,
      at: parseReceived(receivedAt),
    });
  }

  function submitEntry() {
    setSuccess("");
    if (!found) {
      setNotice(unknown ? "Cette référence n’existe pas encore. Ajoutez le produit." : "Recherchez et sélectionnez un produit.");
      return;
    }
    if (!color || !size) {
      setNotice("Choisissez une couleur et une taille.");
      return;
    }
    if (!(amount > 0)) {
      setNotice("Indiquez une quantité supérieure à 0.");
      return;
    }
    recordLine(found, color, size, amount, unitCost > 0 ? unitCost : found.cost);
    setSuccess(`Entrée enregistrée avec succès. ${amount} × ${found.name} — ${color} / ${size} ajoutés au stock.`);
    setNotice("");
    setQty("");
  }

  function submitBulk() {
    setSuccess("");
    if (!found || bulkLines.length === 0) {
      setNotice(!found ? "Sélectionnez un produit." : "Saisissez au moins une quantité dans la grille.");
      return;
    }
    const unit = unitCost > 0 ? unitCost : found.cost;
    bulkLines.forEach((line) => recordLine(found, line.color, line.size, line.qty, unit));
    setSuccess(`Réception enregistrée avec succès. ${bulkCount} articles — ${found.name} ajoutés au stock.`);
    setNotice("");
    setBulkQty({});
  }

  function saveManual(event: React.FormEvent) {
    event.preventDefault();
    const colors = splitList(manual.colors);
    const sizes = splitList(manual.sizes);
    const price = Number(manual.price);
    if (!manual.ref.trim() || !manual.name.trim() || !(price >= 0) || !colors.length || !sizes.length) {
      setNotice("Référence, nom, prix, couleur et pointure sont requis.");
      return;
    }
    const product = upsertProduct({
      ref: manual.ref.trim().toUpperCase(),
      name: manual.name.trim(),
      price,
      photo: manual.photo,
      colors,
      sizes,
      category: manual.category,
      stock: 0,
    });
    pick(product);
    setManualOpen(false);
    setSuccess(`${product.name} est enregistré. Saisissez la quantité à entrer.`);
  }

  async function startScan() {
    setScanHint("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanHint("Caméra indisponible. Saisissez le code-barres ci-dessous.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play();
      });
      const Detector = (window as Window & { BarcodeDetector?: new (opts?: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (!Detector) {
        setScanHint("Placez le code dans le champ ci-dessous, ou utilisez un lecteur USB.");
        return;
      }
      const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"] });
      const tick = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          scanLoop.current = requestAnimationFrame(() => { void tick(); });
          return;
        }
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            applyCode(codes[0].rawValue);
            stopScan();
            return;
          }
        } catch { /* keep */ }
        scanLoop.current = requestAnimationFrame(() => { void tick(); });
      };
      scanLoop.current = requestAnimationFrame(() => { void tick(); });
    } catch {
      setScanHint("Accès caméra refusé. Saisissez le code-barres ou utilisez un lecteur.");
    }
  }

  function stopScan() {
    cancelAnimationFrame(scanLoop.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  return (
    <section className="entree-page">
      <header className="entree-head">
        <div>
          <h1>Entrées</h1>
          <p>Réceptionnez les produits et ajoutez facilement les quantités au stock.</p>
        </div>
        <div className="entree-head-actions">
          <button type="button" className="entree-ghost" onClick={() => { setSearch(""); setFoundRef(null); setQty(""); setSuccess(""); formRef.current?.scrollIntoView({ behavior: "smooth" }); }}>Nouvelle entrée</button>
          <button type="button" className="entree-ghost" onClick={() => onNavigate?.("historique")}>Voir l’historique</button>
        </div>
      </header>

      <div className="entree-kpis">
        <article className="entree-kpi"><p>Entrées aujourd’hui</p><strong>+{kpis.today}</strong><small>articles</small></article>
        <article className="entree-kpi"><p>Entrées ce mois</p><strong>+{kpis.month}</strong><small>articles</small></article>
        <article className="entree-kpi"><p>Valeur des entrées</p><strong>{formatPrice(kpis.value)}</strong><small>ce mois</small></article>
        <article className="entree-kpi"><p>Dernière réception</p><strong>{kpis.last ? timeAgo(kpis.last.at) : "—"}</strong><small>{kpis.last ? kpis.last.product : "Aucune"}</small></article>
      </div>

      <div className="entree-main">
        <form ref={formRef} className="entree-card" onSubmit={(e) => { e.preventDefault(); bulk ? submitBulk() : submitEntry(); }}>
          <h2>Nouvelle entrée</h2>
          <label className="entree-field">
            <span>Rechercher un produit</span>
            <div className="entree-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="6" /><path d="M16 16.5 20 20.5" /></svg>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setOpenSuggest(true); setSuccess(""); }} onFocus={() => setOpenSuggest(true)} placeholder="Référence, nom ou code-barres — ESC-001" autoComplete="off" autoFocus />
            </div>
            {openSuggest && suggestions.length > 0 && !found ? (
              <ul className="entree-suggest">
                {suggestions.slice(0, 6).map((item) => (
                  <li key={item.ref}><button type="button" onClick={() => pick(item)}><strong>{item.name}</strong><em>{item.ref}</em></button></li>
                ))}
              </ul>
            ) : null}
          </label>

          {found && !bulk ? (
            <>
              <p className="entree-label">Stock actuel — cliquez une case pour choisir la variante</p>
              <Matrix product={found} selected={`${color}|${size}`} onPick={(c, s) => { setColor(c); setSize(s); }} />
              {color && size ? <p className="entree-current">{color} / {size} — Stock actuel : <b>{currentQty}</b></p> : null}
              <div className="entree-row">
                <label className="entree-field"><span>Quantité à ajouter</span><input ref={qtyRef} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="10" /></label>
                <label className="entree-field"><span>Prix d’achat unitaire</span><input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))} placeholder="3500" /></label>
              </div>
              {lineTotal > 0 ? <p className="entree-total">Total de l’entrée : <b>{formatPrice(lineTotal)}</b></p> : null}
            </>
          ) : null}

          {found && bulk ? (
            <>
              <p className="entree-label">Saisissez les quantités à ajouter</p>
              <BulkMatrix product={found} values={bulkQty} onChange={setBulkQty} />
              <label className="entree-field"><span>Prix d’achat unitaire</span><input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ""))} /></label>
              {bulkCount > 0 ? <p className="entree-total">Total articles ajoutés : <b>{bulkCount}</b> · Valeur totale : <b>{formatPrice(bulkValue)}</b></p> : null}
            </>
          ) : null}

          <label className="entree-field">
            <span>Fournisseur</span>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">Sélectionner un fournisseur</option>
              {suppliers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          {addingSupplier ? (
            <div className="entree-add-sup">
              <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Nom du fournisseur" />
              <button type="button" className="entree-submit entree-mini" onClick={() => { const created = addSupplier(newSupplier); if (created) { setSupplier(created.name); setNewSupplier(""); setAddingSupplier(false); } }}>Ajouter</button>
            </div>
          ) : (
            <button type="button" className="entree-link" onClick={() => setAddingSupplier(true)}>+ Ajouter un fournisseur</button>
          )}

          <div className="entree-row">
            <label className="entree-field"><span>Date de réception</span><input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} /></label>
            <label className="entree-field"><span>N° facture / document</span><input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="FAC-2026-089" /></label>
          </div>
          <label className="entree-field"><span>Note facultative</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une remarque..." /></label>
          <button type="submit" className="entree-submit">{bulk ? "Valider la réception" : "+ Ajouter au stock"}</button>
          {found ? <button type="button" className="entree-link" onClick={() => setBulk((v) => !v)}>{bulk ? "Revenir à une seule variante" : "Ajouter plusieurs variantes"}</button> : null}
          <button type="button" className="entree-link" onClick={() => { setManual({ ...EMPTY, ref: search }); setManualOpen(true); }}>Le produit n’existe pas ? L’ajouter comme sur le site</button>
        </form>

        <aside className="entree-side">
          {found ? (
            <article className="entree-card entree-info">
              <h2>Fiche produit</h2>
              {found.photo ? <img src={found.photo} alt="" /> : <div className="entree-photo-empty">Sans photo</div>}
              <strong>{found.name}</strong>
              <span className="entree-ref">{found.ref}</span>
              <p className="entree-meta">Catégorie : {found.category}</p>
              <p className="entree-meta">Prix d’achat : {formatPrice(found.cost)}</p>
              <p className="entree-price">{formatPrice(found.price)}</p>
              <p className="entree-meta">Prix de vente : {formatPrice(found.price)}</p>
              <div className="entree-chips"><p>Couleurs</p><ul>{found.colors.map((item) => <li key={item}><i style={{ background: colorHex(item) }} />{item}</li>)}</ul></div>
              <div className="entree-chips"><p>Tailles</p><ul>{orderedSizes(found.sizes).map((item) => <li key={item}>{item}</li>)}</ul></div>
              <p className="entree-preview">Stock total actuel : <b>{found.stock}</b></p>
            </article>
          ) : unknown ? (
            <article className="entree-card entree-empty">
              <h2>Référence inconnue</h2>
              <p>Aucun produit ne correspond à <b>{search}</b>.</p>
              <button type="button" className="entree-submit" onClick={() => { setManual({ ...EMPTY, ref: search }); setManualOpen(true); }}>Créer ce produit</button>
            </article>
          ) : (
            <article className="entree-card entree-empty">
              <h2>Fiche produit</h2>
              <p>Recherchez une référence ou un nom pour afficher la photo, les prix, les couleurs et les tailles.</p>
            </article>
          )}
        </aside>
      </div>

      {success ? <p className="entree-notice entree-ok">{success}</p> : null}
      {notice ? <p className="entree-notice">{notice}</p> : null}

      {manualOpen ? (
        <form className="entree-card" onSubmit={saveManual}>
          <h2>Ajouter un produit</h2>
          <div className="entree-grid">
            <label className="entree-field"><span>Référence</span><input value={manual.ref} onChange={(e) => setManual({ ...manual, ref: e.target.value.toUpperCase() })} required /></label>
            <label className="entree-field"><span>Nom</span><input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} required /></label>
            <label className="entree-field"><span>Catégorie</span><select value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="entree-field"><span>Prix (DA)</span><input inputMode="numeric" value={manual.price} onChange={(e) => setManual({ ...manual, price: e.target.value.replace(/[^\d]/g, "") })} required /></label>
            <label className="entree-field"><span>Couleurs</span><input value={manual.colors} onChange={(e) => setManual({ ...manual, colors: e.target.value })} placeholder="Noir, Beige" /></label>
            <label className="entree-field"><span>Pointures</span><input value={manual.sizes} onChange={(e) => setManual({ ...manual, sizes: e.target.value })} placeholder="37, 38, 39" /></label>
          </div>
          <div className="entree-manual-actions">
            <button type="submit" className="entree-submit">Enregistrer le produit</button>
            <button type="button" className="entree-link" onClick={() => setManualOpen(false)}>Annuler</button>
          </div>
        </form>
      ) : null}

      <section className="entree-card entree-scan">
        <div>
          <h2>Scanner</h2>
          <p>Scannez le code-barres du produit pour le sélectionner automatiquement.</p>
        </div>
        {scanning ? (
          <div className="entree-camera">
            <video ref={videoRef} muted playsInline />
            <button type="button" className="entree-link" onClick={stopScan}>Fermer le scanner</button>
          </div>
        ) : (
          <button type="button" className="entree-scan-btn" onClick={() => void startScan()}>Scanner un code-barres</button>
        )}
        <label className="entree-field">
          <span>Ou saisir / coller le code-barres</span>
          <input placeholder="Code-barres" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode((e.target as HTMLInputElement).value); } }} onBlur={(e) => { if (e.target.value.trim()) applyCode(e.target.value); }} />
        </label>
        {scanHint ? <p className="entree-hint">{scanHint}</p> : null}
      </section>

      <section className="entree-card">
        <div className="entree-history-head">
          <h2>Dernières entrées</h2>
          <button type="button" className="entree-link" onClick={() => onNavigate?.("historique")}>Voir toutes les entrées →</button>
        </div>
        <div className="entree-table-wrap">
          <table className="entree-table">
            <thead><tr><th>Date</th><th>Produit</th><th>Référence</th><th>Variante</th><th>Quantité</th><th>Fournisseur</th><th>Prix total</th><th>Utilisateur</th></tr></thead>
            <tbody>
              {lastEntries.map((item) => {
                const product = findByRef(item.ref);
                const name = product?.name ?? item.product.split(" · ")[0];
                const variant = item.color && item.size ? `${item.color} / ${item.size}` : item.product.split(" · ")[1] ?? "—";
                const unit = item.cost ?? product?.cost ?? 0;
                return (
                  <tr key={item.id}>
                    <td>{formatMoveDay(item.at)}</td>
                    <td>{name}</td>
                    <td>{item.ref}</td>
                    <td>{variant}</td>
                    <td>+{Math.abs(item.qty)}</td>
                    <td>{item.supplier ?? "—"}</td>
                    <td>{unit ? formatPrice(unit * Math.abs(item.qty)) : "—"}</td>
                    <td>{item.by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function Matrix({ product, selected, onPick }: { product: CatalogProduct; selected: string; onPick: (c: string, s: string) => void }) {
  const sizes = orderedSizes(product.sizes);
  return (
    <div className="entree-matrix-wrap">
      <table className="entree-matrix">
        <thead><tr><th />{sizes.map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {product.colors.map((c) => (
            <tr key={c}>
              <th>{c}</th>
              {sizes.map((s) => {
                const q = cellQty(product, c, s);
                if (q == null) return <td key={s} className="empty">—</td>;
                return <td key={s}><button type="button" className={selected === `${c}|${s}` ? "on" : undefined} onClick={() => onPick(c, s)}>{q}</button></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkMatrix({ product, values, onChange }: { product: CatalogProduct; values: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  const sizes = orderedSizes(product.sizes);
  return (
    <div className="entree-matrix-wrap">
      <table className="entree-matrix">
        <thead><tr><th />{sizes.map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>
          {product.colors.map((c) => (
            <tr key={c}>
              <th>{c}</th>
              {sizes.map((s) => {
                const key = `${c}|${s}`;
                return <td key={s}><input inputMode="numeric" value={values[key] ?? ""} placeholder="+" onChange={(e) => onChange({ ...values, [key]: e.target.value.replace(/[^\d]/g, "") })} /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function splitList(value: string) { return value.split(/[,;/]+/).map((item) => item.trim()).filter(Boolean); }
function cellQty(product: CatalogProduct, color: string, size: string) {
  const v = product.variants.find((item) => item.color === color && item.size === size);
  return v ? v.qty : undefined;
}
function orderedSizes(sizes: string[]) {
  return [...sizes].sort((a, b) => {
    const na = Number(a); const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return Number.isFinite(na) ? -1 : Number.isFinite(nb) ? 1 : a.localeCompare(b, "fr");
  });
}
function colorHex(name: string) {
  const map: Record<string, string> = { noir: "#1c1c1c", beige: "#c4a574", champagne: "#e8d5a3", bordeaux: "#6b1d2a", or: "#c9a86c" };
  return map[name.toLowerCase()] ?? "#8a8078";
}
function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseReceived(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}
function sameDay(value: number, now: Date) {
  const d = new Date(value);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function sameMonth(value: number, now: Date) {
  const d = new Date(value);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
function timeAgo(value: number) {
  const mins = Math.max(0, Math.round((Date.now() - value) / 60000));
  if (mins < 1) return "À l’instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `Il y a ${hours} h` : formatMoveDay(value);
}
