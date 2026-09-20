"use client";

import { useState } from "react";
import Image from "next/image";
import { Send, Check, Upload, X } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { useLanguage } from "@/context/LanguageContext";
import { isValidInstagramHandle } from "@/lib/instagram";
import { t } from "@/lib/i18n";

type Product = { id: string; nameFr: string; nameAr: string; slug: string };

export default function AvisClient({ products }: { products: Product[] }) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const [form, setForm] = useState({
    customerName: "",
    instagram: "",
    productId: "",
    message: "",
  });
  const [rating, setRating] = useState(5);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos((prev) => [...prev, data.url]);
    } catch {
      alert(tr.reviews.uploadError);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidInstagramHandle(form.instagram)) {
      alert(tr.reviews.instagramError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          instagramHandle: form.instagram.trim() || null,
          productId: form.productId || null,
          message: form.message,
          rating,
          photos,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setForm({ customerName: "", instagram: "", productId: "", message: "" });
      setRating(5);
      setPhotos([]);
    } catch {
      alert(tr.reviews.error);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Check className="mx-auto mb-4 text-[#25d366]" size={48} />
        <h1 className="font-display text-2xl font-medium text-[#4d3525]">{tr.reviews.successTitle}</h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.reviews.successSub}</p>
        <button type="button" onClick={() => setSent(false)} className="btn-neon mt-8 rounded-full px-8 py-3 text-sm">
          OK
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-10 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.nav.reviews}</span>
        <h1 className="font-display mt-3 text-4xl font-medium">
          <span className="italic text-[#8b6914]">{tr.reviews.formTitle}</span>
        </h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.reviews.formSub}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-6 md:p-8">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#4d3525]">{tr.reviews.name}</label>
          <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#4d3525]">{tr.reviews.instagram}</label>
          <input
            type="text"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder={tr.reviews.instagramPlaceholder}
            dir="ltr"
            className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#4d3525]">{tr.reviews.product}</label>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}
            className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c]">
            <option value="">{tr.reviews.productOptional}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{lang === "fr" ? p.nameFr : p.nameAr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#4d3525]">{tr.reviews.rating}</label>
          <StarRating rating={rating} interactive onChange={setRating} size={28} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#4d3525]">{tr.reviews.message}</label>
          <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c]" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#4d3525]">{tr.reviews.photos}</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#a07d3e]/25 bg-white/35 py-6 text-sm text-[#806f60] transition hover:border-[#c9a86c]/60">
            <Upload size={18} />
            {uploading ? "..." : tr.reviews.uploadPhoto}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#a07d3e]/15">
                  <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                  <button type="button" onClick={() => setPhotos(photos.filter((p) => p !== url))}
                    className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}
          className="btn-neon flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm disabled:opacity-50">
          <Send size={18} />
          {loading ? "..." : tr.reviews.submit}
        </button>
      </form>
    </div>
  );
}
