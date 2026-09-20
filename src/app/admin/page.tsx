import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Package,
  ShoppingCart,
  Image,
  Mail,
  Star,
  Tag,
  Truck,
  Building2,
  LayoutGrid,
} from "lucide-react";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default async function AdminDashboard() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const [products, orders, messages, gallery, pendingReviews, promos, catalogs] = await Promise.all([
    prisma.product.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.galleryImage.count(),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { onPromo: true } }),
    prisma.catalog.count(),
  ]);

  const cards = [
    { href: "/admin/produits", label: "Produits", count: products, icon: Package, accent: "#b8956a" },
    { href: "/admin/catalogues", label: "Catalogues", count: catalogs, icon: LayoutGrid, accent: "#bf00ff" },
    { href: "/admin/promotions", label: "En promotion", count: promos, icon: Tag, accent: "#c9a86c" },
    { href: "/admin/commandes", label: "Commandes en attente", count: orders, icon: ShoppingCart, accent: "#c9a86c" },
    { href: "/admin/avis", label: "Avis en attente", count: pendingReviews, icon: Star, accent: "#e4cf9a" },
    { href: "/admin/messages", label: "Messages non lus", count: messages, icon: Mail, accent: "#a07d3e" },
    { href: "/admin/galerie", label: "Images galerie", count: gallery, icon: Image, accent: "#d8c79a" },
    { href: "/admin/livraison", label: "Tarifs livraison", count: null, icon: Truck, accent: "#c9a86c" },
    { href: "/admin/bureaux", label: "Bureaux", count: null, icon: Building2, accent: "#b8956a" },
  ];

  return (
    <div>
      <div className="admin-page-header mb-8 flex items-center justify-between">
        <div>
          <span className="admin-page-badge">Administration</span>
          <h1 className="font-display mt-2 text-2xl font-bold admin-page-title md:text-3xl">
            Tableau de bord
          </h1>
        </div>
        <LogoutButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(({ href, label, count, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="admin-card admin-dash-card group rounded-xl p-6 transition hover:shadow-md"
            style={{ borderTopColor: accent }}
          >
            <Icon className="mb-3 transition group-hover:scale-110" size={24} style={{ color: accent }} />
            {count !== null ? (
              <p className="font-display text-3xl font-bold text-slate-900">{count}</p>
            ) : (
              <p className="font-display text-lg font-bold text-slate-900">Gérer</p>
            )}
            <p className="admin-muted mt-1 text-sm font-medium">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
