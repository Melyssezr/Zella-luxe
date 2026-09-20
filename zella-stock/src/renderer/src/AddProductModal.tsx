import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { findByRef, stockStatus, upsertProduct, type StockStatus } from "./catalog";
import { hexFromColorName } from "./color-hex";
import accueilBg from "./assets/accueil-bg.png";

type Props = {
  onClose: () => void;
};

type ColorRow = {
  id: string;
  nameFr: string;
  nameAr: string;
  hex: string;
  photo: string;
  sizes: string[];
  sizeDraft: string;
};

const SIZE_PRESETS = [
  "36", "37", "38", "39", "40", "41", "42", "43",
  "Unique", "Caba", "Grande", "Moyenne", "Petite", "Série",
];
const BASE_CATEGORIES = [
  "Sandales",
  "Mocassins",
  "Sacs",
  "Pochettes",
  "Valises",
  "Lunettes",
  "Coque de téléphone",
  "Escarpins",
  "Sabot",
  "Ballerines",
  "Mulles",
  "Porte feuille",
  "Boots",
  "Compensé",
  "Basket",
];

const STATUS_COPY: Record<StockStatus, { label: string; hint: string }> = {
  ok: { label: "Disponible", hint: "Stock au-dessus du seuil" },
  bas: { label: "Stock bas", hint: "À réapprovisionner" },
  rupture: { label: "Rupture", hint: "Aucune pièce disponible" },
};

function newColor(): ColorRow {
  return { id: crypto.randomUUID(), nameFr: "", nameAr: "", hex: "#ffffff", photo: "", sizes: [], sizeDraft: "" };
}

function emptyForm() {
  return {
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    ref: "",
    category: "",
    designation: "",
    brand: "",
    barcode: "",
    photo: "",
    price: "",
    cost: "",
    minStock: "2",
    perSize: false,
    sizePrices: {} as Record<string, string>,
    onPromo: false,
    promoPrice: "",
    featured: false,
    colors: [newColor()],
    qty: {} as Record<string, string>,
  };
}

function promoOff(price: number, promo: number) {
  if (!(price > 0) || !(promo > 0) || promo >= price) return 0;
  return Math.round((1 - promo / price) * 100);
}

function qtyKey(colorId: string, size: string) {
  return `${colorId}::${size}`;
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AddProductModal({ onClose }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [customCategory, setCustomCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categories = BASE_CATEGORIES;

  const colors = form.colors.filter((row) => row.nameFr.trim());
  const allSizes = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const row of form.colors) {
      for (const size of row.sizes) {
        if (!seen.has(size)) {
          seen.add(size);
          list.push(size);
        }
      }
    }
    return list;
  }, [form.colors]);

  const totalStock = useMemo(() => {
    return form.colors.reduce((sum, row) => {
      return sum + row.sizes.reduce((inner, size) => inner + (Number(form.qty[qtyKey(row.id, size)]) || 0), 0);
    }, 0);
  }, [form.colors, form.qty]);

  const minStock = Number(form.minStock) || 0;
  const status = stockStatus(totalStock, minStock);
  const sizePriceMap = Object.fromEntries(allSizes.map((size) => [size, Number(form.sizePrices[size]) || 0]));
  const salePrice = form.perSize
    ? (Object.values(sizePriceMap).filter((value) => value > 0).sort((a, b) => a - b)[0] ?? 0)
    : Number(form.price) || 0;
  const promoPrice = Number(form.promoPrice) || 0;
  const discount = form.onPromo ? promoOff(salePrice, promoPrice) : 0;

  function setHex(id: string, raw: string) {
    const hex = (raw.startsWith("#") ? raw : `#${raw}`).slice(0, 7);
    updateColor(id, { hex });
  }

  function patch<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function updateColor(id: string, next: Partial<ColorRow>) {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...next };
        if (next.nameFr != null) {
          const named = hexFromColorName(next.nameFr);
          const previousNamed = hexFromColorName(row.nameFr);
          const hex = (row.hex || "").toLowerCase();
          const auto = !hex || hex === "#ffffff" || (previousNamed && previousNamed.toLowerCase() === hex);
          if (named && auto) merged.hex = named;
        }
        return merged;
      }),
    }));
    setError("");
    setSuccess("");
  }

  function addSize(row: ColorRow, raw: string) {
    const size = raw.trim();
    if (!size || row.sizes.includes(size)) {
      updateColor(row.id, { sizeDraft: "" });
      return;
    }
    updateColor(row.id, { sizes: [...row.sizes, size], sizeDraft: "" });
  }

  function removeSize(row: ColorRow, size: string) {
    setForm((current) => {
      const qty = { ...current.qty };
      delete qty[qtyKey(row.id, size)];
      return {
        ...current,
        qty,
        colors: current.colors.map((item) => (
          item.id === row.id ? { ...item, sizes: item.sizes.filter((value) => value !== size) } : item
        )),
      };
    });
  }

  function applyCustomCategory() {
    const value = customCategory.trim();
    if (!value) return;
    patch("category", value);
    setCustomCategory("");
  }

  function save(stay: boolean) {
    const name = form.name.trim();
    const ref = form.ref.trim().toUpperCase();
    const category = form.category.trim() || customCategory.trim();
    const readyColors = form.colors
      .map((row) => ({
        ...row,
        nameFr: row.nameFr.trim(),
        nameAr: row.nameAr.trim(),
        sizes: row.sizes.length ? row.sizes : ["Unique"],
      }))
      .filter((row) => row.nameFr);

    if (!name || !ref) {
      setError("Le nom et la référence sont requis.");
      return;
    }
    if (!category) {
      setError("Choisissez une catégorie.");
      return;
    }
    if (findByRef(ref)) {
      setError("Cette référence existe déjà.");
      return;
    }
    if (readyColors.length === 0) {
      setError("Ajoutez au moins une couleur.");
      return;
    }

    const sizes = [...new Set(readyColors.flatMap((row) => row.sizes))];
    const sizePrices = Object.fromEntries(
      sizes.map((size) => [size, form.perSize ? Math.max(0, Number(form.sizePrices[size]) || 0) : Math.max(0, Number(form.price) || 0)]),
    );
    const price = form.perSize
      ? (Object.values(sizePrices).filter((value) => value > 0).sort((a, b) => a - b)[0] ?? 0)
      : Math.max(0, Number(form.price) || 0);

    upsertProduct({
      ref,
      name,
      nameAr: form.nameAr.trim(),
      price,
      cost: Math.max(0, Number(form.cost) || 0),
      photo: form.photo,
      colors: readyColors.map((row) => row.nameFr),
      sizes,
      category,
      minStock,
      description: form.description.trim(),
      descriptionAr: form.descriptionAr.trim(),
      designation: form.designation.trim(),
      brand: form.brand.trim(),
      barcode: form.barcode.trim(),
      uniquePrice: !form.perSize,
      sizePrices,
      onPromo: form.onPromo,
      promoPrice: form.onPromo ? Math.max(0, Number(form.promoPrice) || 0) : 0,
      featured: form.featured,
      colorInfo: readyColors.map((row) => ({
        name: row.nameFr,
        nameAr: row.nameAr,
        photo: row.photo,
        hex: row.hex || hexFromColorName(row.nameFr),
      })),
      variants: readyColors.flatMap((row) =>
        row.sizes.map((size) => ({
          color: row.nameFr,
          size,
          qty: Math.max(0, Number(form.qty[qtyKey(row.id, size)]) || 0),
        })),
      ),
    });

    if (stay) {
      setForm(emptyForm());
      setCustomCategory("");
      setError("");
      setSuccess(`${name} a été enregistré. Vous pouvez créer le suivant.`);
      return;
    }
    onClose();
  }

  return (
    <div className="add-screen" aria-label="Ajouter un produit" style={{ backgroundImage: `url(${accueilBg})` }}>
      <header className="add-bar">
        <div className="add-bar-inner">
          <div className="add-bar-nav">
            <button type="button" className="add-back" onClick={onClose} aria-label="Retour au stock">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 6 9 12l6 6" />
              </svg>
            </button>
            <div className="add-bar-title">
              <h2>Nouveau produit</h2>
              <div className="add-bar-crumb">
                <button type="button" onClick={onClose}>Stock</button>
                <i />
                <span>Catalogue</span>
              </div>
            </div>
          </div>
          <div className="add-bar-actions">
            <button type="button" className="add-ghost" onClick={onClose}>Annuler</button>
            <button type="button" className="add-stay" onClick={() => save(true)}>Enregistrer et rester</button>
            <button type="button" className="add-save" onClick={() => save(false)}>Enregistrer et quitter</button>
          </div>
        </div>
      </header>

      <form className="add-studio" onSubmit={(event) => event.preventDefault()}>
        <aside className="add-preview">
          <PhotoStage
            value={form.photo}
            onChange={(photo) => patch("photo", photo)}
            discount={discount}
            featured={form.featured}
          />
          <div className="add-preview-meta">
            <p>{form.category || "Sans catégorie"}</p>
            <h2>{form.name.trim() || "Nom du produit"}</h2>
            {form.nameAr.trim() ? <b className="add-name-ar" dir="rtl">{form.nameAr}</b> : null}
            <span>{form.ref.trim() || "Référence"}</span>
            <div className={`add-preview-status ${status}`}>
              <i />
              <b>{STATUS_COPY[status].label}</b>
              <em>{totalStock} pcs</em>
            </div>
          </div>
        </aside>

        <div className="add-editor">
          {error ? <p className="add-notice bad">{error}</p> : null}
          {success ? <p className="add-notice ok">{success}</p> : null}

          <section className="add-block">
            <header>
              <span className="add-idx">01</span>
              <h3>Identité</h3>
            </header>
            <div className="add-block-body">
              <div className="add-fields">
                <label>
                  <span>Nom (FR)</span>
                  <input value={form.name} onChange={(event) => patch("name", event.target.value)} placeholder="Escarpin Luna" />
                </label>
                <label>
                  <span>Nom (AR)</span>
                  <input dir="rtl" value={form.nameAr} onChange={(event) => patch("nameAr", event.target.value)} placeholder="حذاء لونا" />
                </label>
                <label>
                  <span>Référence</span>
                  <input value={form.ref} onChange={(event) => patch("ref", event.target.value)} placeholder="ESC-001" />
                </label>
                <label>
                  <span>Code-barres <em>optionnel</em></span>
                  <input value={form.barcode} onChange={(event) => patch("barcode", event.target.value)} placeholder="EAN / code interne" />
                </label>
                <label>
                  <span>Désignation produit <em>optionnel</em></span>
                  <input value={form.designation} onChange={(event) => patch("designation", event.target.value)} placeholder="Libellé ticket / facture" />
                </label>
                <label>
                  <span>Marque <em>optionnel</em></span>
                  <input value={form.brand} onChange={(event) => patch("brand", event.target.value)} placeholder="Interne à Zella Stock" />
                </label>
                <div className="wide add-cat-field">
                  <span>Catégorie</span>
                  <div className="add-cats">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={form.category === item ? "on" : undefined}
                        onClick={() => patch("category", item)}
                      >
                        {item}
                      </button>
                    ))}
                    <input
                      value={customCategory}
                      onChange={(event) => setCustomCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyCustomCategory();
                        }
                      }}
                      onBlur={applyCustomCategory}
                      placeholder="Autre…"
                    />
                  </div>
                </div>
                <label>
                  <span>Description FR</span>
                  <textarea value={form.description} onChange={(event) => patch("description", event.target.value)} rows={3} placeholder="Matière, talon, usage…" />
                </label>
                <label>
                  <span>Description AR</span>
                  <textarea dir="rtl" value={form.descriptionAr} onChange={(event) => patch("descriptionAr", event.target.value)} rows={3} placeholder="الوصف" />
                </label>
              </div>
            </div>
          </section>

          <section className="add-block">
            <header>
              <span className="add-idx">02</span>
              <h3>Couleurs & tailles</h3>
              <button type="button" className="add-text" onClick={() => patch("colors", [...form.colors, newColor()])}>
                + Couleur
              </button>
            </header>
            <div className="add-block-body add-vars">
              {form.colors.map((row, index) => (
                <article key={row.id} className="add-var">
                  <PhotoStage compact value={row.photo} onChange={(photo) => updateColor(row.id, { photo })} />
                  <div className="add-var-fields">
                    <div className="add-var-top">
                      <strong>Variante {String(index + 1).padStart(2, "0")}</strong>
                      {form.colors.length > 1 ? (
                        <button type="button" className="add-text danger" onClick={() => patch("colors", form.colors.filter((item) => item.id !== row.id))}>
                          Retirer
                        </button>
                      ) : null}
                    </div>
                    <div className="add-fields trio">
                      <label>
                        <span>Couleur FR</span>
                        <input value={row.nameFr} onChange={(event) => updateColor(row.id, { nameFr: event.target.value })} placeholder="Noir" />
                      </label>
                      <label>
                        <span>Couleur AR</span>
                        <input dir="rtl" value={row.nameAr} onChange={(event) => updateColor(row.id, { nameAr: event.target.value })} placeholder="أسود" />
                      </label>
                      <label>
                        <span>Teinte</span>
                        <div className="add-picker">
                          <label className="add-swatch-lg" style={{ background: /^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#ffffff" }} title="Choisir une couleur">
                            <input
                              type="color"
                              value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#ffffff"}
                              onChange={(event) => updateColor(row.id, { hex: event.target.value })}
                            />
                          </label>
                          <input
                            className="add-hex-input"
                            value={row.hex}
                            onChange={(event) => setHex(row.id, event.target.value)}
                            placeholder="#000000"
                            spellCheck={false}
                          />
                        </div>
                      </label>
                    </div>
                    <div className="add-sizes">
                      <span>Tailles</span>
                      <div className="add-size-row">
                        {row.sizes.map((size) => (
                          <button key={size} type="button" className="add-chip on" onClick={() => removeSize(row, size)}>
                            {size}
                          </button>
                        ))}
                        <input
                          value={row.sizeDraft}
                          onChange={(event) => updateColor(row.id, { sizeDraft: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSize(row, row.sizeDraft);
                            }
                          }}
                          placeholder="Taille"
                        />
                      </div>
                      <div className="add-presets">
                        {SIZE_PRESETS.filter((size) => !row.sizes.includes(size)).map((size) => (
                          <button key={size} type="button" className="add-chip" onClick={() => addSize(row, size)}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="add-block">
            <header>
              <span className="add-idx">03</span>
              <h3>Stock par couleur × taille</h3>
              <b>{totalStock} pcs</b>
            </header>
            <div className="add-block-body">
            {colors.length === 0 || allSizes.length === 0 ? (
              <p className="add-hint">Nommez une couleur et ajoutez ses tailles pour ouvrir la grille.</p>
            ) : (
              <div className="add-matrix-wrap">
                <table className="add-matrix">
                  <thead>
                    <tr>
                      <th>Couleur</th>
                      {allSizes.map((size) => <th key={size}>{size}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {form.colors.filter((row) => row.nameFr.trim()).map((row) => (
                      <tr key={row.id}>
                        <th>{row.nameFr}</th>
                        {allSizes.map((size) => (
                          <td key={size}>
                            {row.sizes.includes(size) ? (
                              <input
                                inputMode="numeric"
                                value={form.qty[qtyKey(row.id, size)] ?? ""}
                                onChange={(event) => patch("qty", { ...form.qty, [qtyKey(row.id, size)]: event.target.value.replace(/[^\d]/g, "") })}
                                placeholder="0"
                              />
                            ) : (
                              <span className="empty">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </section>

          <section className="add-block">
            <header>
              <span className="add-idx">04</span>
              <h3>Prix & alertes</h3>
            </header>
            <div className="add-block-body">
            <label className="add-check">
              <input type="checkbox" checked={form.perSize} onChange={(event) => patch("perSize", event.target.checked)} />
              <span>Prix unitaire par taille</span>
              <small>{form.perSize ? "Un prix pour chaque taille" : "Un prix unique pour toutes les tailles"}</small>
            </label>
            {form.perSize && allSizes.length === 0 ? (
              <p className="add-hint">Ajoutez des tailles pour saisir un prix unitaire.</p>
            ) : null}
            {form.perSize && allSizes.length > 0 ? (
              <div className="add-size-prices">
                {allSizes.map((size) => (
                  <label key={size}>
                    <span>Taille {size}</span>
                    <input
                      inputMode="numeric"
                      value={form.sizePrices[size] ?? ""}
                      onChange={(event) => patch("sizePrices", { ...form.sizePrices, [size]: event.target.value.replace(/[^\d]/g, "") })}
                      placeholder="0"
                    />
                    <small>DA</small>
                  </label>
                ))}
              </div>
            ) : null}
            <div className={form.perSize ? "add-metrics" : "add-metrics four"}>
              {form.perSize ? null : (
                <label>
                  <span>Prix de vente</span>
                  <input inputMode="numeric" value={form.price} onChange={(event) => patch("price", event.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
                  <small>DA — toutes les tailles</small>
                </label>
              )}
              <label>
                <span>Prix d’achat</span>
                <input inputMode="numeric" value={form.cost} onChange={(event) => patch("cost", event.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
                <small>DA</small>
              </label>
              <label>
                <span>Seuil</span>
                <input inputMode="numeric" value={form.minStock} onChange={(event) => patch("minStock", event.target.value.replace(/[^\d]/g, ""))} />
                <small>qté alertée</small>
              </label>
              <div className={`add-metric-status ${status}`}>
                <span>Statut</span>
                <strong>{STATUS_COPY[status].label}</strong>
                <small>{STATUS_COPY[status].hint}</small>
              </div>
            </div>
            </div>
          </section>

          <section className="add-block">
            <header>
              <span className="add-idx">05</span>
              <h3>Mise en avant</h3>
            </header>
            <div className="add-block-body">
            <div className="add-flags">
              <label className="add-check">
                <input type="checkbox" checked={form.onPromo} onChange={(event) => patch("onPromo", event.target.checked)} />
                <span>Promo</span>
                <small>Affiche une réduction sur la fiche</small>
              </label>
              <label className="add-check">
                <input type="checkbox" checked={form.featured} onChange={(event) => patch("featured", event.target.checked)} />
                <span>Coup de cœur</span>
                <small>Produit mis en avant</small>
              </label>
            </div>
            {form.onPromo ? (
              <div className="add-metrics promo">
                <label>
                  <span>Prix promo</span>
                  <input inputMode="numeric" value={form.promoPrice} onChange={(event) => patch("promoPrice", event.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
                  <small>DA</small>
                </label>
                <div className="add-metric-status">
                  <span>Réduction</span>
                  <strong>{discount > 0 ? `-${discount} %` : "—"}</strong>
                  <small>{discount > 0 ? "Indexé sur la photo" : "Le prix promo doit être inférieur au prix de vente"}</small>
                </div>
              </div>
            ) : null}
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}

function PhotoStage({
  value,
  onChange,
  compact,
  discount = 0,
  featured = false,
}: {
  value: string;
  onChange: (src: string) => void;
  compact?: boolean;
  discount?: number;
  featured?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function take(file?: File) {
    if (!file) return;
    onChange(await readImage(file));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    void take(event.dataTransfer.files[0]);
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    await take(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <div
      className={`add-stage${compact ? " compact" : ""}${over ? " over" : ""}${value ? " has" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => void onPick(event)} />
      {value ? <img src={value} alt="" /> : (
        <p>{compact ? "Photo" : "Déposez une image ou cliquez pour ajouter"}</p>
      )}
      {!compact && discount > 0 ? <b className="add-promo-badge">-{discount}%</b> : null}
      {!compact && featured ? <em className="add-heart">Coup de cœur</em> : null}
      <div className="add-stage-actions">
        <button type="button" onClick={() => inputRef.current?.click()}>{value ? "Modifier" : "Ajouter"}</button>
        {value ? <button type="button" className="danger" onClick={() => onChange("")}>Supprimer</button> : null}
      </div>
    </div>
  );
}
