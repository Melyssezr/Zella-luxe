"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Image,
  Star,
  Mail,
  Truck,
  Building2,
  LayoutGrid,
} from "lucide-react";
import type { CatalogRecord } from "@/lib/categories";

const MAIN_LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/catalogues", label: "Catalogues", icon: LayoutGrid },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/galerie", label: "Galerie", icon: Image },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/livraison", label: "Livraison", icon: Truck },
  { href: "/admin/bureaux", label: "Bureaux", icon: Building2 },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const onProducts = pathname.startsWith("/admin/produits");
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);

  useEffect(() => {
    if (!onProducts) return;
    fetch("/api/admin/catalogs")
      .then((r) => r.json())
      .then(setCatalogs)
      .catch(() => setCatalogs([]));
  }, [onProducts]);

  return (
    <header className="admin-nav">
      <div className="admin-nav-inner mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <Link href="/admin" className="admin-nav-brand font-display mr-2 shrink-0 text-lg font-bold">
            Zella<span className="admin-nav-brand-accent"> Admin</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-0.5">
            {MAIN_LINKS.map((link) => {
              const { href, label, icon: Icon } = link;
              const exact = "exact" in link ? link.exact : false;
              const active = isActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`admin-nav-link inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    active ? "admin-nav-link-active" : ""
                  }`}
                >
                  <Icon size={14} className="shrink-0 opacity-80" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <Link href="/" className="admin-nav-back ml-auto shrink-0 text-xs font-medium">
            ← Site
          </Link>
        </div>

        {onProducts && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
            <Link
              href="/admin/produits"
              className={`admin-category-pill ${!activeCategory ? "admin-category-pill-active" : ""}`}
            >
              Tous
            </Link>
            {catalogs.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/admin/produits?category=${cat.slug}`}
                  className={`admin-category-pill ${isActive ? "admin-category-pill-active" : ""}`}
                  style={
                    isActive
                      ? {
                          background: cat.accentColor,
                          boxShadow: `0 0 16px ${cat.accentColor}55`,
                          borderColor: cat.accentColor,
                        }
                      : {
                          borderColor: `${cat.accentColor}66`,
                          color: cat.accentColor,
                        }
                  }
                >
                  {cat.nameFr}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
