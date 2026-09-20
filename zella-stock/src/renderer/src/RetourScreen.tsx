import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  addStock,
  findByRef,
  formatPrice,
  listCatalog,
  type CatalogProduct,
} from "./catalog";
import { logMovement, productLine } from "./movements";

const MOTIFS = ["Taille incorrecte", "Défaut", "Changement d’avis", "Couleur", "Autre"];

type Draft = {
  product: CatalogProduct;
  color: string;
  size: string;
  qty: number;
};

type Props = {
  actor?: string;
};

export function RetourScreen({ actor = "Admin" }: Props) {
  const products = listCatalog();
  const [client, setClient] = useState("Sara");
  const [ref, setRef] = useState(products[0]?.ref ?? "");
  const [color, setColor] = useState(products[0]?.colors[0] ?? "");
  const [size, setSize] = useState(products[0]?.sizes.includes("40") ? "40" : products[0]?.sizes[0] ?? "");
  const [qty, setQty] = useState("1");
  const [motif, setMotif] = useState("Taille incorrecte");
  const [notice, setNotice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [lastScan, setLastScan] = useState<CatalogProduct | null>(null);
  const [ticket, setTicket] = useState<Draft | null>(null);
  const [ticketQty, setTicketQty] = useState("1");
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
    if (!ticket) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTicket(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ticket]);

  function preferredSize(item: CatalogProduct) {
    if (item.sizes.includes("40")) return "40";
    return item.sizes[0] ?? "";
  }

  function openTicket(item: CatalogProduct, nextColor = item.colors[0] ?? "", nextSize = preferredSize(item), nextQty = 1) {
    setTicket({ product: { ...item }, color: nextColor, size: nextSize, qty: nextQty });
    setTicketQty(String(nextQty));
    setLastScan(item);
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
    openTicket(item);
  }

  function putBack(item: CatalogProduct, nextColor: string, nextSize: string, amount: number) {
    const before = item.stock;
    const updated = addStock(item.ref, amount, nextColor, nextSize);
    if (!updated) {
      setNotice("Impossible de remettre cet article en stock.");
      return false;
    }
    logMovement({
      type: "retour",
      ref: item.ref,
      product: `${productLine(item.name, nextColor, nextSize)} · ${client || "Cliente"} · ${motif}`,
      qty: amount,
      by: actor,
      actor: "gold",
    });
    setNotice(`Le stock ${nextSize} ${nextColor} passe de ${before} à ${updated.stock}.`);
    setQty("1");
    return true;
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    if (!client.trim()) {
      setNotice("Indiquez le nom de la cliente.");
      return;
    }
    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Indiquez une quantité supérieure à 0.");
      return;
    }
    putBack(product, color, size, amount);
  }

  function confirmScan() {
    if (!ticket) return;
    const amount = Number(ticketQty);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (putBack(ticket.product, ticket.color, ticket.size, amount)) {
      setTicket(null);
    }
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
  const ticketAmount = Number(ticketQty) || 0;

  return (
    <section className="sortie-page retour-page">
      <header className="sortie-head">
        <div>
          <h1>Retour cliente</h1>
          <p>Remettez un article à la main, ou scannez le code-barres pour ouvrir le ticket de retour.</p>
        </div>
      </header>

      <div className="sortie-split">
        <form className="sortie-card" onSubmit={submitManual}>
          <h2>Manuellement</h2>
          <label className="sortie-field">
            <span>Cliente</span>
            <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Sara" />
          </label>
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
              Le stock {size} {color} passe de {product.stock} à {product.stock + amount}
            </p>
          ) : null}
          <button type="submit" className="sortie-submit">
            Remettre en stock
          </button>
          <button type="button" className="sortie-cancel" onClick={() => { setQty("1"); setClient("Sara"); }}>
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
          <p className="sortie-scan-lead">Passe le code-barres pour un retour cliente</p>
          <button type="button" className="sortie-scan-btn" onClick={() => void startScan()}>
            Scanner
          </button>
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
              <button type="button" onClick={() => openTicket(lastScan)}>
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

      {ticket ? (
        <div
          className="sortie-overlay"
          role="dialog"
          aria-labelledby="retour-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setTicket(null);
          }}
        >
          <article className="sortie-card sortie-vente">
            <p className="sortie-kicker">Retour cliente</p>
            <h2 id="retour-title">{ticket.product.name}</h2>
            {ticket.product.photo ? <img src={ticket.product.photo} alt="" /> : null}
            <p className="sortie-vente-ref">{ticket.product.ref} · {client || "Cliente"}</p>
            <div className="sortie-row">
              <label className="sortie-field">
                <span>Couleur</span>
                <select value={ticket.color} onChange={(event) => setTicket({ ...ticket, color: event.target.value })}>
                  {ticket.product.colors.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="sortie-field">
                <span>Pointure</span>
                <select value={ticket.size} onChange={(event) => setTicket({ ...ticket, size: event.target.value })}>
                  {ticket.product.sizes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="sortie-row">
              <label className="sortie-field">
                <span>Quantité</span>
                <input inputMode="numeric" value={ticketQty} onChange={(event) => setTicketQty(event.target.value.replace(/[^\d]/g, ""))} />
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
            <ul className="sortie-ticket">
              <li><span>Prix unitaire</span><b>{formatPrice(ticket.product.price)}</b></li>
              <li><span>Quantité</span><b>{ticketAmount || 0}</b></li>
              <li className="total"><span>Total</span><b>{formatPrice(ticket.product.price * ticketAmount)}</b></li>
            </ul>
            <p className="sortie-stock">
              Le stock {ticket.size} {ticket.color} passe de {ticket.product.stock} à {ticket.product.stock + ticketAmount}
            </p>
            <button type="button" className="sortie-submit" onClick={confirmScan}>
              Remettre en stock
            </button>
            <button type="button" className="sortie-cancel" onClick={() => setTicket(null)}>
              Annuler
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}
