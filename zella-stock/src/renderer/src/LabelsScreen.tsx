import { useMemo, useState } from "react";
import { formatPrice, listCatalog, type CatalogProduct } from "./catalog";
import { buildVariantLabelTspl } from "./label-tspl";
import { loadSettings } from "./settings";
import { encodeVariantCode, labelFields, variantKind } from "./variant-code";

async function writeTempTspl(content: string): Promise<string> {
  if (window.zellaStock?.writeTempLabel) return window.zellaStock.writeTempLabel(content);
  throw new Error("writeTempLabel indisponible - mets a jour le main process 1.1");
}

export function LabelsScreen() {
  const products = listCatalog();
  const settings = loadSettings();
  const [ref, setRef] = useState(products[0]?.ref ?? "");
  const [color, setColor] = useState(products[0]?.colors[0] ?? "");
  const [size, setSize] = useState(products[0]?.sizes[0] ?? "");
  const [copies, setCopies] = useState("1");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const product = useMemo(
    () => products.find((item) => item.ref === ref) ?? products[0] ?? null,
    [products, ref],
  );

  const fields = product ? labelFields(product, color, size) : null;
  const code = product ? encodeVariantCode(product.ref, color, size) : "";
  const kind = product ? variantKind(product.category) : "other";

  function pickProduct(next: CatalogProduct) {
    setRef(next.ref);
    setColor(next.colors[0] ?? "Unique");
    setSize(next.sizes[0] ?? "Unique");
    setNotice("");
  }

  async function printOne() {
    if (!product) return;
    const printerName = settings.printerName?.trim();
    if (!printerName) {
      setNotice("Parametres: choisis l imprimante Xprinter.");
      return;
    }
    if (!window.zellaStock?.printRawLabel) {
      setNotice("Impression etiquette indisponible dans cette build.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const tspl = buildVariantLabelTspl({
        product,
        color,
        size,
        copies: Math.max(1, Number(copies) || 1),
      });
      const filePath = await writeTempTspl(tspl);
      const result = await window.zellaStock.printRawLabel({ printerName, filePath });
      setNotice(result.ok ? `OK etiquette ${code}` : result.error);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Echec impression");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="params-page">
      <header className="params-head">
        <div>
          <h1>Etiquettes</h1>
          <p>Couleur / pointure / taille selon le type — scan = variante exacte</p>
        </div>
        {notice ? <span className="params-status">{notice}</span> : null}
      </header>

      <div className="params-box">
        <h2>Article</h2>
        <div className="params-grid">
          <label className="wide">
            Produit
            <select
              value={ref}
              onChange={(e) => {
                const next = products.find((item) => item.ref === e.target.value);
                if (next) pickProduct(next);
              }}
            >
              {products.map((item) => (
                <option key={item.ref} value={item.ref}>
                  {item.name} — {item.ref}
                </option>
              ))}
            </select>
          </label>
          <label>
            Couleur
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {(product?.colors ?? []).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            {kind === "shoe" ? "Pointure" : "Taille"}
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {(product?.sizes ?? []).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Exemplaires
            <input
              inputMode="numeric"
              value={copies}
              onChange={(e) => setCopies(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>
      </div>

      <div className="params-box">
        <h2>Apercu ticket</h2>
        <p className="params-hint">
          Type detecte: <b>{kind}</b>
          {product ? ` · ${formatPrice(product.price)}` : ""}
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.6 }}>
          <li>ZELLA LUXE</li>
          <li>{product?.ref}</li>
          <li>{product?.name}</li>
          {(fields?.lines ?? []).map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Code scan: {code}</li>
        </ul>
      </div>

      <div className="params-actions">
        <button type="button" className="params-save" disabled={busy || !product} onClick={() => void printOne()}>
          {busy ? "Impression…" : "Imprimer etiquette"}
        </button>
      </div>
    </section>
  );
}
