"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <header className="mb-8 flex flex-col items-center text-center">
          <SiteLogo variant="admin" linked={false} showText={false} />
          <span className="admin-login-badge mt-5">Administration</span>
          <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-slate-900">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-slate-500">Zella Luxe — espace réservé</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="admin-login-notice">
            <Lock size={15} className="mt-0.5 shrink-0 text-[#b8956a]" aria-hidden />
            <span>Accès réservé aux administrateurs autorisés.</span>
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password">Mot de passe</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="admin-login-toggle"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="admin-login-error" role="alert">
              <AlertCircle size={15} className="shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="admin-btn-primary w-full py-3">
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <Link href="/" className="admin-login-footer">
          <ArrowLeft size={14} aria-hidden />
          Retour à la boutique
        </Link>
      </div>
    </div>
  );
}
