"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, X, Trash2, Star } from "lucide-react";
import { parseJsonArray } from "@/lib/utils";

type Review = {
  id: string;
  customerName: string;
  instagramHandle: string | null;
  phone: string | null;
  message: string;
  rating: number;
  photos: string;
  status: string;
  createdAt: string;
  product?: { nameFr: string; slug: string } | null;
};

export default function AdminReviewsClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState("PENDING");

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    fetch("/api/reviews?admin=1")
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(text || `Erreur ${r.status}`);
        }
        return r.json();
      })
      .then(setReviews)
      .catch(() => setLoadError("Impossible de charger les avis. Redémarrez le serveur de développement."));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = filter === "ALL" ? reviews : reviews.filter((r) => r.status === filter);
  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold admin-page-title">Avis clients</h1>
          {pendingCount > 0 && (
            <p className="mt-1 text-sm text-[#c9a86c]">{pendingCount} en attente de validation</p>
          )}
        </div>
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                filter === s ? "bg-[#b8956a] text-white" : "admin-card text-slate-700"
              }`}
            >
              {s === "ALL" ? "Tous" : s === "PENDING" ? "En attente" : s === "APPROVED" ? "Approuvés" : "Refusés"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loadError && (
          <p className="admin-card rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </p>
        )}
        {filtered.length === 0 && !loadError && (
          <p className="admin-card rounded-xl p-8 text-center admin-muted">Aucun avis</p>
        )}
        {filtered.map((review) => {
          const photos = parseJsonArray(review.photos);
          return (
            <div key={review.id} className="admin-card rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{review.customerName}</p>
                    <div className="flex">
                      {Array.from({ length: review.rating }, (_, i) => (
                        <Star key={i} size={14} className="fill-[#ffd700] text-[#ffd700]" />
                      ))}
                    </div>
                  </div>
                  {review.product && (
                    <p className="text-xs text-[#b8956a]">Produit : {review.product.nameFr}</p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">&ldquo;{review.message}&rdquo;</p>
                  {review.instagramHandle && (
                    <p className="mt-1 text-xs admin-muted">@{review.instagramHandle}</p>
                  )}
                  <p className="mt-1 text-xs admin-muted">
                    {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    review.status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : review.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {review.status}
                </span>
              </div>
              {photos.length > 0 && (
                <div className="mt-4 flex gap-2">
                  {photos.map((url) => (
                    <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {review.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(review.id, "APPROVED")}
                    className="flex items-center gap-1 rounded-full bg-green-600 px-4 py-1.5 text-xs text-white"
                  >
                    <Check size={14} /> Approuver
                  </button>
                )}
                {review.status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(review.id, "REJECTED")}
                    className="flex items-center gap-1 rounded-full border px-4 py-1.5 text-xs text-gray-600"
                  >
                    <X size={14} /> Refuser
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(review.id)}
                  className="ml-auto text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
