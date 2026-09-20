"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  User,
  Phone,
  MapPin,
  Home,
  Building2,
  Package,
  Calendar,
  Truck,
  StickyNote,
  Trash2,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { InstagramIcon } from "@/components/InstagramIcon";

type OrderItem = {
  productId?: string;
  nameFr?: string;
  nameAr?: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  image?: string;
  available?: boolean;
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  firstName: string;
  lastName: string;
  phone: string;
  instagramHandle: string | null;
  address: string;
  wilayaName: string;
  wilayaCode: string;
  deliveryMethod: string;
  deliveryAddress: string | null;
  deliveryOfficeName: string | null;
  commune?: string | null;
  items: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: string;
  notes: string | null;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  shippingError?: string | null;
  createdAt: string;
};

const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const ORDER_STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

const STATUS_STYLES: Record<(typeof STATUSES)[number], string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-800 border-sky-200",
  SHIPPED: "bg-violet-100 text-violet-800 border-violet-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const DELIVERY_LABELS: Record<string, string> = {
  HOME: "Livraison à domicile",
  OFFICE: "Retrait au bureau",
};

function formatDa(amount: number) {
  return `${amount.toLocaleString("fr-FR")} DA`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseItems(raw: string): OrderItem[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function phoneSearchVariants(value: string | null | undefined): string[] {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return [];

  const variants = new Set([digits]);
  if (digits.startsWith("213") && digits.length > 3) {
    variants.add(`0${digits.slice(3)}`);
  } else if (digits.startsWith("0") && digits.length > 1) {
    variants.add(`213${digits.slice(1)}`);
  }
  return [...variants];
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-[#8b6914] hover:underline">
      {value}
    </a>
  ) : (
    <span className="font-medium text-slate-800">{value}</span>
  );

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e8] text-[#8b6914]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm">{content}</p>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
  onShipWorldExpress,
  onDelete,
  onPreviewImage,
  onAvailabilityChange,
  shippingBusy,
  deleting,
  availabilityBusyKey,
}: {
  order: Order;
  onStatusChange: (id: string, status: string) => void;
  onShipWorldExpress: (id: string) => void;
  onDelete: (id: string) => void;
  onPreviewImage: (src: string, alt: string) => void;
  onAvailabilityChange: (orderId: string, itemIndex: number, available: boolean) => void;
  shippingBusy: boolean;
  deleting: boolean;
  availabilityBusyKey: string | null;
}) {
  const items = parseItems(order.items);
  const status = order.status as (typeof STATUSES)[number];
  const isHome = order.deliveryMethod === "HOME";

  return (
    <article
      className={`admin-card overflow-hidden rounded-2xl border shadow-sm ${
        status === "PENDING"
          ? "border-amber-300 ring-2 ring-amber-100"
          : "border-slate-200/80"
      }`}
    >
      {/* En-tête */}
      <header
        className={`flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 ${
          status === "PENDING"
            ? "border-amber-100 bg-gradient-to-r from-amber-50 to-white"
            : "border-slate-100 bg-gradient-to-r from-[#faf8f5] to-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                status === "PENDING"
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-[#8b6914]/10 text-[#8b6914]"
              }`}
            >
              <Package size={18} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Commande</p>
              <p className="font-display text-lg font-bold text-slate-900">#{order.orderNumber}</p>
            </div>
          </div>
          {status === "PENDING" && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
              Nouvelle
            </span>
          )}
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {ORDER_STATUS_LABELS[status] ?? order.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar size={14} />
            <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
          </div>
          <select
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm"
            aria-label="Changer le statut"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDelete(order.id)}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            title="Supprimer la commande"
          >
            <Trash2 size={16} />
            {deleting ? "…" : "Supprimer"}
          </button>
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
        {/* Client */}
        <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            <User size={16} className="text-[#8b6914]" />
            Cliente
          </h3>
          <div className="space-y-3">
            <InfoRow icon={<User size={16} />} label="Nom complet" value={order.customerName} />
            <InfoRow icon={<Phone size={16} />} label="Téléphone" value={order.phone} href={`tel:${order.phone}`} />
            {order.instagramHandle && (
              <InfoRow
                icon={<InstagramIcon size={16} />}
                label="Instagram"
                value={`@${order.instagramHandle}`}
                href={`https://instagram.com/${order.instagramHandle}`}
              />
            )}
          </div>
        </section>

        {/* Livraison */}
        <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            <Truck size={16} className="text-[#8b6914]" />
            Livraison
          </h3>
          <div className="space-y-3">
            <InfoRow
              icon={<MapPin size={16} />}
              label="Wilaya"
              value={`${order.wilayaCode} — ${order.wilayaName}`}
            />
            <InfoRow
              icon={isHome ? <Home size={16} /> : <Building2 size={16} />}
              label="Mode"
              value={DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}
            />
            {order.commune && (
              <InfoRow icon={<MapPin size={16} />} label="Commune" value={order.commune} />
            )}
            {isHome && order.deliveryAddress && (
              <InfoRow icon={<Home size={16} />} label="Adresse" value={order.deliveryAddress} />
            )}
            {!isHome && order.deliveryOfficeName && (
              <InfoRow icon={<Building2 size={16} />} label="Bureau de retrait" value={order.deliveryOfficeName} />
            )}
            {order.trackingNumber && (
              <InfoRow
                icon={<Truck size={16} />}
                label="Suivi World Express"
                value={order.trackingNumber}
                href={`https://suivi.ecotrack.dz/suivi/${order.trackingNumber}`}
              />
            )}
            {order.shippingError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                World Express : {order.shippingError}
              </p>
            )}
            {!order.trackingNumber && order.status !== "CANCELLED" && (
              <button
                type="button"
                disabled={shippingBusy}
                onClick={() => onShipWorldExpress(order.id)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b6914] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5410] disabled:opacity-50"
              >
                <Truck size={16} />
                {shippingBusy ? "Envoi…" : "Créer expédition World Express"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Articles */}
      <section className="border-t border-slate-100 px-5 py-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          <Package size={16} className="text-[#8b6914]" />
          Articles ({items.length})
        </h3>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="hidden px-4 py-3 sm:table-cell">Détails</th>
                <th className="px-4 py-3 text-center">Qté</th>
                <th className="px-4 py-3 text-right">Prix unit.</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const lineTotal = item.price * item.quantity;
                const details = [item.size && `Taille ${item.size}`, item.color].filter(Boolean).join(" · ");
                const isAvailable = item.available !== false;
                const itemBusy = availabilityBusyKey === `${order.id}:${idx}`;
                return (
                  <tr key={idx} className={isAvailable ? "bg-white" : "bg-red-50/70"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <button
                            type="button"
                            onClick={() =>
                              onPreviewImage(item.image!, item.nameFr ?? "Produit commandé")
                            }
                            className="group relative h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 shadow-sm outline-none ring-[#8b6914]/30 transition hover:border-[#8b6914] focus-visible:ring-4 sm:h-20 sm:w-20"
                            aria-label={`Agrandir la photo de ${item.nameFr ?? "l’article"}`}
                            title="Cliquer pour agrandir"
                          >
                            <Image
                              src={item.image}
                              alt={item.nameFr ?? "Produit commandé"}
                              fill
                              className="object-cover transition group-hover:scale-105"
                              sizes="80px"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                              <ZoomIn size={22} aria-hidden="true" />
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f5f0e8] text-[#8b6914] sm:h-20 sm:w-20">
                            <Package size={22} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-medium ${
                                isAvailable ? "text-slate-900" : "text-slate-500 line-through"
                              }`}
                            >
                              {item.nameFr ?? "Article"}
                            </span>
                            {!isAvailable && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                Pas disponible · exclu du total
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={status !== "PENDING" || itemBusy}
                              onClick={() => onAvailabilityChange(order.id, idx, true)}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                isAvailable
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              Disponible
                            </button>
                            <button
                              type="button"
                              disabled={status !== "PENDING" || itemBusy}
                              onClick={() => onAvailabilityChange(order.id, idx, false)}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                !isAvailable
                                  ? "border-red-500 bg-red-500 text-white"
                                  : "border-red-200 bg-white text-red-700 hover:bg-red-50"
                              }`}
                            >
                              {itemBusy ? "…" : "Pas disponible"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {details || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatDa(item.price)}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        isAvailable ? "text-slate-900" : "text-slate-400 line-through"
                      }`}
                    >
                      {formatDa(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notes + totaux */}
      <footer className="flex flex-col gap-4 border-t border-slate-100 bg-[#faf8f5]/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        {order.notes ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 sm:max-w-md">
            <StickyNote size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Notes client</p>
              <p className="mt-1">{order.notes}</p>
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="w-full rounded-xl border border-slate-200 bg-white p-4 sm:w-72">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Sous-total produits</dt>
              <dd>{formatDa(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Frais de livraison</dt>
              <dd>{formatDa(order.shippingCost)}</dd>
            </div>
            <div className="border-t border-slate-100 pt-2">
              <div className="flex justify-between text-base font-bold text-[#8b6914]">
                <dt>Total</dt>
                <dd>{formatDa(order.total)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </footer>
    </article>
  );
}

type StatusFilter = (typeof STATUSES)[number] | "ALL";

const TAB_LABELS: Record<StatusFilter, string> = {
  PENDING: "Nouvelles",
  CONFIRMED: "Confirmées",
  SHIPPED: "Expédiées",
  DELIVERED: "Livrées",
  CANCELLED: "Annulées",
  ALL: "Toutes",
};

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingBusyId, setShippingBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weStatus, setWeStatus] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("PENDING");
  const [query, setQuery] = useState("");
  const [availabilityBusyKey, setAvailabilityBusyKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(
    null
  );

  const load = () =>
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data: Order[]) => {
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        setOrders(list);
      });

  useEffect(() => {
    load();
    fetch("/api/admin/world-express/test")
      .then((r) => r.json())
      .then((d) => {
        if (!d.configured) setWeStatus("World Express : token non configuré");
        else if (d.ok) setWeStatus("World Express : API OK");
        else setWeStatus(`World Express : ${d.error || "erreur"}`);
      })
      .catch(() => setWeStatus(""));
  }, []);

  useEffect(() => {
    if (!previewImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewImage]);

  const counts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length;
      return acc;
    },
    { ALL: orders.length } as Record<StatusFilter, number>
  );

  const q = query.trim().toLowerCase();
  const phoneQueryVariants = phoneSearchVariants(query);
  const filtered = orders.filter((o) => {
    if (tab !== "ALL" && o.status !== tab) return false;
    if (!q) return true;
    const phoneMatches =
      phoneQueryVariants.length > 0 &&
      phoneSearchVariants(o.phone).some((phone) =>
        phoneQueryVariants.some((needle) => phone.includes(needle))
      );
    if (phoneMatches) return true;
    const haystack = [
      o.orderNumber,
      o.customerName,
      o.firstName,
      o.lastName,
      o.phone,
      o.instagramHandle,
      o.wilayaName,
      o.wilayaCode,
      o.commune,
      o.address,
      o.deliveryAddress,
      o.deliveryOfficeName,
      o.trackingNumber,
      o.notes,
      ORDER_STATUS_LABELS[o.status as (typeof STATUSES)[number]] ?? o.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Impossible de modifier le statut");
        return;
      }
      await load();
    } catch {
      alert("Erreur réseau");
    }
  };

  const updateItemAvailability = async (
    orderId: string,
    itemIndex: number,
    available: boolean
  ) => {
    const busyKey = `${orderId}:${itemIndex}`;
    setAvailabilityBusyKey(busyKey);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemAvailability: { index: itemIndex, available } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Impossible de modifier la disponibilité");
        return;
      }
      await load();
    } catch {
      alert("Erreur réseau");
    } finally {
      setAvailabilityBusyKey(null);
    }
  };

  const deleteOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (
      !confirm(
        `Supprimer définitivement la commande #${order?.orderNumber ?? ""} ?\nCette action est irréversible.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Impossible de supprimer la commande");
      }
      await load();
    } catch {
      alert("Erreur réseau");
    } finally {
      setDeletingId(null);
    }
  };

  const shipWorldExpress = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    const suggested =
      order?.commune && !order.commune.toLowerCase().includes("bureau")
        ? order.commune
        : order?.wilayaName || "";

    const commune = window.prompt(
      "Commune officielle World Express (orthographe exacte).\nEx. pour Adrar : Adrar\nNe mettez pas le nom du bureau.",
      suggested
    );
    if (commune == null) return;
    if (commune.trim().length < 2) {
      alert("Commune obligatoire.");
      return;
    }

    if (!confirm(`Créer l'expédition World Express ?\nCommune : ${commune.trim()}`)) return;
    setShippingBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/world-express`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commune: commune.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Échec World Express");
      } else {
        alert(`Expédition créée.\nSuivi : ${data.trackingNumber}`);
      }
      await load();
    } catch {
      alert("Erreur réseau");
    } finally {
      setShippingBusyId(null);
    }
  };

  const tabs: StatusFilter[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "ALL"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold admin-page-title">Commandes</h1>
          <p className="admin-muted mt-1 text-sm">
            {counts.PENDING > 0 ? (
              <span className="font-semibold text-amber-700">
                {counts.PENDING} nouvelle{counts.PENDING !== 1 ? "s" : ""} en attente
              </span>
            ) : (
              <>Aucune nouvelle commande</>
            )}
            <span className="text-slate-400"> · {orders.length} au total</span>
          </p>
          {weStatus && <p className="mt-1 text-xs text-slate-500">{weStatus}</p>}
        </div>
      </div>

      <div className="mb-4">
        <label className="sr-only" htmlFor="order-search">
          Rechercher une commande
        </label>
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="order-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : n° téléphone, n° commande, nom, wilaya, commune, suivi…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#b8956a] focus:ring-2 focus:ring-[#b8956a]/20"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((key) => {
          const active = tab === key;
          const count = counts[key] ?? 0;
          const isNew = key === "PENDING" && count > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? isNew
                    ? "bg-amber-500 text-white shadow-md"
                    : "bg-[#8b6914] text-white shadow-md"
                  : isNew
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {TAB_LABELS[key]}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  active
                    ? "bg-white/25 text-white"
                    : isNew
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onStatusChange={updateStatus}
            onShipWorldExpress={shipWorldExpress}
            onDelete={deleteOrder}
            onPreviewImage={(src, alt) => setPreviewImage({ src, alt })}
            onAvailabilityChange={updateItemAvailability}
            shippingBusy={shippingBusyId === order.id}
            deleting={deletingId === order.id}
            availabilityBusyKey={availabilityBusyKey}
          />
        ))}
        {filtered.length === 0 && (
          <div className="admin-card rounded-2xl py-16 text-center">
            <Package className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="admin-muted">
              {q
                ? `Aucun résultat pour « ${query.trim()} »`
                : tab === "PENDING"
                  ? "Aucune nouvelle commande en attente"
                  : `Aucune commande « ${TAB_LABELS[tab].toLowerCase()} »`}
            </p>
          </div>
        )}
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={previewImage.alt}
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white transition hover:bg-black/70"
            aria-label="Fermer la photo"
          >
            <X size={24} />
          </button>
          <div
            className="relative h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-black/30 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={previewImage.src}
              alt={previewImage.alt}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 95vw, 1024px"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
