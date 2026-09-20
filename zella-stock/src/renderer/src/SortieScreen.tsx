import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Page } from "./App";
import {
  findByRef,
  availableQty,
  formatPrice,
  listCatalog,
  removeStock,
  type CatalogProduct,
} from "./catalog";
import { logMovement, productLine } from "./movements";

const MOTIFS = ["Vente boutique", "Retour fournisseur", "Transfert magasin", "Perte / casse", "Autre"];

type CartLine = {
  id: string;
  product: CatalogProduct;
  color: string;
  size: string;
  qty: number;
};

type Ticket = {
  number: string;
  at: number;
  lines: CartLine[];
  total: number;
};

type Props = {
  onNavigate: (page: Page) => void;
  actor?: string;
};

export function SortieScreen({ onNavigate, actor = "Admin" }: Props) {
  const products = listCatalog();
  const [ref, setRef] = useState(products[0]?.ref ?? "");
  const [color, setColor] = useState(products[0]?.colors[0] ?? "");
  const [size, setSize] = useState(
    products[0]?.sizes.includes("40") ? "40" : products[0]?.sizes[0] ?? "",
  );
  const [qty, setQty] = useState("1");
  const [motif, setMotif] = useState("Vente boutique");
  const [notice, setNotice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [lastScan, setLastScan] = useState<CatalogProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [search, setSearch] = useState("");
  const [scanCode, setScanCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoop = useRef(0);

  const product = useMemo(() => findByRef(ref) ?? products[0] ?? null, [ref, products]);

  useEffect(() => {
    if (!product) return;
    setColor((current) => (product.colors.includes(current) ? current : product.colors[0] ?? ""));
    setSize((current) => {
      if (product.sizes.includes(current)) return current;
      if (product.sizes.includes("40")) return "40";
      return product.sizes[0] ?? "";
    });
  }, [product]);

  useEffect(() => () => stopScan(), []);

  useEffect(() => {
    if (!cart.length && !ticket) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTicket(null);
        setCart([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length, ticket]);

  function preferredSize(item: CatalogProduct, fallback = "") {
    if (fallback && item.sizes.includes(fallback)) return fallback;
    if (item.sizes.includes("40")) return "40";
    return item.sizes[0] ?? "";
  }

  function addToCart(item: CatalogProduct, nextColor = item.colors[0] ?? "", nextSize = preferredSize(item), nextQty = 1) {
    const id = `${item.ref}-${nextColor}-${nextSize}`;
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) {
        return current.map((line) => (line.id === id ? { ...line, qty: line.qty + nextQty } : line));
      }
      return [...current, { id, product: { ...item }, color: nextColor, size: nextSize, qty: nextQty }];
    });
    setLastScan(item);
    setTicket(null);
  }

  function applyScan(code: string) {
    if (!code.trim()) return;
    const item = findByRef(code);
    if (!item) {
      setNotice(`Code inconnu : ${code.trim().toUpperCase()}`);
      return;
    }
    setRef(item.ref);
    setLastScan(item);
    stopScan();
    addToCart(item);
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Indiquez une quantité supérieure à 0.");
      return;
    }
    const onHand = availableQty(product, color, size);
    if (onHand < amount) {
      setNotice(`Stock insuffisant (${onHand} disponible${onHand > 1 ? "s" : ""}).`);
      return;
    }
    if (motif === "Vente boutique") {
      addToCart(product, color, size, amount);
      return;
    }
    const updated = removeStock(product.ref, amount, color, size);
    if (!updated) {
      setNotice("Impossible de retirer cette quantité.");
      return;
    }
    logMovement({
      type: motif.startsWith("Retour") ? "retour" : "sortie",
      ref: product.ref,
      product: productLine(product.name, color, size),
      qty: -amount,
      by: actor,
      actor: "gold",
    });
    setNotice(`${amount} ${product.name} retiré${amount > 1 ? "s" : ""} du stock.`);
    setQty("1");
  }

  function confirmSale() {
    if (cart.length === 0) return;
    for (const line of cart) {
      const live = findByRef(line.product.ref);
      const onHand = live ? availableQty(live, line.color, line.size) : 0;
      if (!live || onHand < line.qty) {
        setNotice(`Stock insuffisant pour ${line.product.name} (${onHand}).`);
        return;
      }
    }
    let total = 0;
    for (const line of cart) {
      const updated = removeStock(line.product.ref, line.qty, line.color, line.size);
      if (!updated) continue;
      total += updated.price * line.qty;
      logMovement({
        type: "sortie",
        ref: line.product.ref,
        product: productLine(line.product.name, line.color, line.size),
        qty: -line.qty,
        by: "Boutique",
        actor: "outline",
      });
    }
    setTicket({
      number: `VB-${Date.now().toString().slice(-6)}`,
      at: Date.now(),
      lines: cart,
      total,
    });
    setNotice(`Vente boutique validée — ${formatPrice(total)}.`);
    setQty("1");
  }

  function scanAnother() {
    const startFresh = Boolean(ticket);
    setTicket(null);
    if (startFresh) setCart([]);
    setSearch("");
    void startScan();
  }

  async function startScan() {
    setScanHint("");
    setNotice("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanHint("Caméra indisponible. Saisissez le code-barres ci-dessous.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
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
        setScanHint("Utilisez un lecteur USB ou saisissez le code, puis Entrée.");
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
          const value = codes[0]?.rawValue;
          if (value) {
            applyScan(value);
            return;
          }
        } catch {
          /* keep scanning */
        }
        scanLoop.current = requestAnimationFrame(() => { void tick(); });
      };
      scanLoop.current = requestAnimationFrame(() => { void tick(); });
    } catch {
      setScanHint("Accès caméra refusé. Saisissez le code-barres.");
    }
  }

  function stopScan() {
    cancelAnimationFrame(scanLoop.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  const amount = Number(qty) || 0;
  const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const suggestions = search.trim()
    ? products.filter((item) => {
        const q = search.trim().toLowerCase();
        return item.name.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q);
      }).slice(0, 5)
    : [];

  return (
    <section className="sortie-page">
      <header className="sortie-head">
        <div>
          <h1>Sorties / ventes</h1>
          <p>Retirez un article à la main, ou scannez le code-barres pour ouvrir la vente boutique.</p>
        </div>
      </header>

      <div className="sortie-split">
        <form className="sortie-card" onSubmit={submitManual}>
          <h2>Manuellement</h2>
          <label className="sortie-field">
            <span>Produit</span>
            <select value={ref} onChange={(event) => setRef(event.target.value)}>
              {products.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {item.name} — {item.ref}
                </option>
              ))}
            </select>
          </label>
          <div className="sortie-row">
            <label className="sortie-field">
              <span>Couleur</span>
              <select value={color} onChange={(event) => setColor(event.target.value)}>
                {(product?.colors ?? []).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="sortie-field">
              <span>Pointure</span>
              <select value={size} onChange={(event) => setSize(event.target.value)}>
                {(product?.sizes ?? []).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="sortie-row">
            <label className="sortie-field">
              <span>Quantité</span>
              <input inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value.replace(/[^\d]/g, ""))} />
            </label>
            <label className="sortie-field">
              <span>Motif</span>
              <select value={motif} onChange={(event) => setMotif(event.target.value)}>
                {MOTIFS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          {product ? (
            <p className="sortie-stock">
              Stock actuel {size} {color} = {product.stock}
              {amount > 0 ? ` · Total ${formatPrice(product.price * amount)}` : ""}
            </p>
          ) : null}
          <button type="submit" className="sortie-submit">
            Retirer du stock
          </button>
          <button type="button" className="sortie-cancel" onClick={() => setQty("1")}>
            Annuler
          </button>
        </form>

        <section className="sortie-card sortie-scan">
          <h2>Par code-barres</h2>
          {scanning ? (
            <div className="sortie-camera">
              <video ref={videoRef} muted playsInline />
              <button type="button" className="sortie-cancel" onClick={stopScan}>Fermer le scanner</button>
            </div>
          ) : (
            <div className="sortie-laser" aria-hidden>
              <b />
              <span />
            </div>
          )}
          <p className="sortie-scan-lead">Passe le code-barres pour une sortie / vente</p>
          <div className="sortie-scan-actions">
            <button type="button" className="sortie-ghost" onClick={() => onNavigate("entree")}>
              Entrée
            </button>
            <button type="button" className="sortie-scan-btn" onClick={() => void startScan()}>
              Sortie
            </button>
          </div>
          <label className="sortie-field">
            <span>Ou saisir le code</span>
            <input
              value={scanCode}
              placeholder="ZL-ESC-12"
              onChange={(event) => setScanCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyScan(scanCode || (event.target as HTMLInputElement).value);
                  setScanCode("");
                }
              }}
            />
          </label>
          {scanHint ? <p className="sortie-hint">{scanHint}</p> : null}
          {lastScan ? (
            <div className="sortie-last">
              <p>Dernier scan</p>
              <button type="button" onClick={() => addToCart(lastScan)}>
                <img src={lastScan.photo} alt="" />
                <span>
                  <strong>{lastScan.name}</strong>
                  {lastScan.ref} · {lastScan.colors[0]} · {lastScan.sizes[0]}
                </span>
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {notice ? <p className="sortie-notice">{notice}</p> : null}

      {cart.length > 0 && !ticket && !scanning ? (
        <div className="sortie-overlay" role="dialog" aria-labelledby="vente-title">
          <article className="sortie-card vente-desk">
            <p className="sortie-kicker">Vente boutique</p>
            <h2 id="vente-title">Vente boutique</h2>
            <div className="vente-grid">
              <div>
                <label className="sortie-field">
                  <span>Ajouter un article</span>
                  <input
                    value={search}
                    placeholder="Ajouter un article..."
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                {suggestions.length > 0 ? (
                  <ul className="vente-suggest">
                    {suggestions.map((item) => (
                      <li key={item.ref}>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(item);
                            setSearch("");
                          }}
                        >
                          <img src={item.photo} alt="" />
                          <span>
                            <strong>{item.name}</strong>
                            {item.ref}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ul className="vente-lines">
                  {cart.map((line) => (
                    <li key={line.id}>
                      <img src={line.product.photo} alt="" />
                      <span>
                        <strong>{line.product.name} {line.color} {line.size}</strong>
                        × {line.qty}
                      </span>
                      <b>{formatPrice(line.product.price * line.qty)}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <aside className="vente-side">
                <p>Total</p>
                <strong>{formatPrice(cartTotal)}</strong>
                <button type="button" className="sortie-submit" onClick={confirmSale}>
                  Valider la vente
                </button>
                <button type="button" className="sortie-ghost vente-scan-again" onClick={scanAnother}>
                  Scanner un nouveau produit
                </button>
                <small>La vente crée une sortie automatiquement</small>
                <button type="button" className="sortie-cancel" onClick={() => setCart([])}>
                  Annuler
                </button>
              </aside>
            </div>
          </article>
        </div>
      ) : null}

      {ticket ? (
        <div className="sortie-overlay" role="dialog" aria-labelledby="ticket-title">
          <article className="sortie-card vente-ticket">
            <p className="sortie-kicker">Ticket de vente</p>
            <h2 id="ticket-title">Vente boutique</h2>
            <p className="sortie-vente-ref">
              N° {ticket.number} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(ticket.at)}
            </p>
            <ul className="sortie-ticket">
              {ticket.lines.map((line) => (
                <li key={line.id}>
                  <span>{line.product.name} {line.color} {line.size} × {line.qty}</span>
                  <b>{formatPrice(line.product.price * line.qty)}</b>
                </li>
              ))}
              <li className="total">
                <span>Total</span>
                <b>{formatPrice(ticket.total)}</b>
              </li>
            </ul>
            <p className="sortie-stock">Sortie enregistrée dans l’historique.</p>
            <button type="button" className="sortie-ghost vente-scan-again" onClick={scanAnother}>
              Scanner un nouveau produit
            </button>
            <button type="button" className="sortie-cancel" onClick={() => { setTicket(null); setCart([]); }}>
              Fermer
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}
