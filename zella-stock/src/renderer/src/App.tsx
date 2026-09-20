import { useState } from "react";
import { AccueilScreen } from "./AccueilScreen";
import { LoginScreen, type Role } from "./LoginScreen";
import { StockScreen } from "./StockScreen";
import { EntreeScreen } from "./EntreeScreen";
import { SortieScreen } from "./SortieScreen";
import { ParametresScreen } from "./ParametresScreen";
import { AlertesScreen } from "./AlertesScreen";
import { HistoriqueScreen } from "./HistoriqueScreen";
import { InventaireScreen } from "./InventaireScreen";
import { ValorisationScreen } from "./ValorisationScreen";
import { RetourScreen } from "./RetourScreen";
import logo from "./assets/zella-logo.jpg";
import accueilBg from "./assets/accueil-bg.png";

export type Page =
  | "accueil" | "stock" | "entree" | "sortie" | "retour"
  | "alertes" | "historique" | "inventaire" | "valorisation" | "parametres";

const NAV: { id: Page; label: string }[] = [
  { id: "accueil", label: "Accueil" },
  { id: "stock", label: "Stock" },
  { id: "entree", label: "Entrées" },
  { id: "sortie", label: "Sorties" },
  { id: "retour", label: "Retours" },
  { id: "alertes", label: "Alertes" },
  { id: "historique", label: "Historique" },
  { id: "inventaire", label: "Inventaire" },
  { id: "valorisation", label: "Valorisation" },
  { id: "parametres", label: "Paramètres" },
];

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [page, setPage] = useState<Page>("accueil");
  const roleLabel = role === "vendeur" ? "Vendeur" : "Admin";
  const roleDetail = role === "vendeur" ? "Vendeur(se)" : "Administrateur";

  if (!role) {
    return (
      <>
        <div className="window-caption"><span>Zella Stock — Zella Luxe</span></div>
        <LoginScreen onConnected={setRole} />
      </>
    );
  }

  return (
    <>
      <div className="window-caption"><span>Zella Stock — Zella Luxe</span></div>
      <div className={page === "accueil" ? "shell scene" : "shell stock-shell"}>
        <div className="scene-bg" style={{ backgroundImage: `url(${accueilBg})` }} />
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-logo-wrap"><img src={logo} alt="" /></span>
            <div><span>ZELLA</span><b>LUXE</b></div>
          </div>
          <nav className="side-nav">
            {NAV.map((item) => (
              <button key={item.id} type="button" className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}>
                <span className="nav-ico"><Dot /></span>
                {item.label}
                {item.id === "alertes" ? <i className="nav-badge">7</i> : null}
              </button>
            ))}
          </nav>
          <div className="side-spacer" />
          <div className="side-foot">
            <div className="side-profile">
              <span className="avatar">{roleLabel[0]}</span>
              <div><strong>{roleLabel}</strong><em>{roleDetail}</em></div>
            </div>
            <button type="button" className="nav-quit" onClick={() => { setRole(null); setPage("accueil"); }}>Déconnexion</button>
          </div>
        </aside>
        {page === "stock" ? <div className="workspace stock-ws"><StockScreen roleLabel={roleLabel} roleDetail={roleDetail} onNavigate={setPage} /></div>
          : page === "entree" ? <div className="workspace stock-ws"><EntreeScreen actor={roleLabel} onNavigate={setPage} /></div>
          : page === "sortie" ? <div className="workspace stock-ws"><SortieScreen onNavigate={setPage} actor={roleLabel} /></div>
          : page === "retour" ? <div className="workspace stock-ws"><RetourScreen actor={roleLabel} /></div>
          : page === "alertes" ? <div className="workspace stock-ws"><AlertesScreen roleLabel={roleLabel} onNavigate={setPage} /></div>
          : page === "historique" ? <div className="workspace stock-ws"><HistoriqueScreen /></div>
          : page === "inventaire" ? <div className="workspace stock-ws"><InventaireScreen actor={roleLabel} /></div>
          : page === "valorisation" ? <div className="workspace stock-ws"><ValorisationScreen /></div>
          : page === "parametres" ? <div className="workspace stock-ws"><ParametresScreen roleLabel={roleLabel} roleDetail={roleDetail} /></div>
          : (
            <div className="workspace scene">
              <header className="topbar"><div className="topbar-copy"><p className="topbar-hello">Bonjour, {roleLabel} 👋</p><h1>Zella Stock</h1></div></header>
              <div className="workspace-main"><AccueilScreen roleLabel={roleLabel} onNavigate={setPage} /></div>
            </div>
          )}
      </div>
    </>
  );
}

function Dot() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /></svg>;
}
