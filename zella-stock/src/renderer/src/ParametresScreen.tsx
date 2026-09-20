import { useState } from "react";
import { listCatalog } from "./catalog";
import { listMovements } from "./movements";
import { loadSettings, saveSettings, type AppSettings } from "./settings";

export function ParametresScreen({ roleLabel, roleDetail }: { roleLabel: string; roleDetail: string }) {
  const [form, setForm] = useState<AppSettings>(() => {
    const saved = loadSettings();
    return { ...saved, displayName: saved.displayName || roleLabel };
  });
  const [notice, setNotice] = useState("");

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function persist() {
    saveSettings(form);
    setNotice("Enregistré.");
  }

  function exportBackup() {
    const payload = { exportedAt: new Date().toISOString(), settings: form, catalog: listCatalog(), movements: listMovements() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zella-stock-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const next = { ...form, lastBackup: new Date().toISOString() };
    saveSettings(next);
    setForm(next);
    setNotice("Sauvegarde téléchargée.");
  }

  return (
    <section className="params-page">
      <header className="params-head">
        <div>
          <h1>Paramètres</h1>
          <p>Boutique, alertes et sauvegarde</p>
        </div>
        {notice ? <span className="params-status">{notice}</span> : null}
      </header>
      <div className="params-box">
        <h2>Boutique</h2>
        <div className="params-grid">
          <label>Nom<input value={form.boutique} onChange={(e) => update("boutique", e.target.value)} /></label>
          <label>Ville<input value={form.city} onChange={(e) => update("city", e.target.value)} /></label>
          <label className="wide">Adresse<input value={form.address} onChange={(e) => update("address", e.target.value)} /></label>
          <label>Téléphone<input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
          <label>Devise<input value="DA" readOnly /></label>
        </div>
      </div>
      <div className="params-box">
        <h2>Stock</h2>
        <div className="params-grid">
          <label>Alerte stock bas<input inputMode="numeric" value={String(form.lowStock)} onChange={(e) => update("lowStock", Number(e.target.value.replace(/[^\d]/g, "") || 0))} /></label>
          <label>Profil<input value={`${roleLabel} — ${roleDetail}`} readOnly /></label>
          <label>Nom affiché<input value={form.displayName} onChange={(e) => update("displayName", e.target.value)} /></label>
          <label>Texte ticket<input value={form.ticketNote} onChange={(e) => update("ticketNote", e.target.value)} /></label>
        </div>
      </div>
      <div className="params-box">
        <h2>Site Zella Luxe</h2>
        <p className="params-hint">Zella Stock publie les produits sur zellaluxe.net. La clé doit être identique à ZELLA_STOCK_KEY sur le site.</p>
        <div className="params-grid">
          <label className="wide">Adresse du site<input value={form.siteUrl} onChange={(e) => update("siteUrl", e.target.value)} placeholder="https://zellaluxe.net" /></label>
          <label className="wide">Clé de synchronisation<input value={form.siteKey} onChange={(e) => update("siteKey", e.target.value)} placeholder="même valeur que ZELLA_STOCK_KEY" /></label>
        </div>
      </div>
      <div className="params-actions">
        <button type="button" className="params-save" onClick={persist}>Enregistrer</button>
        <button type="button" className="params-ghost" onClick={exportBackup}>Sauvegarder</button>
      </div>
    </section>
  );
}
