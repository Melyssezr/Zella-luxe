"use client";

import { useState } from "react";
import { Send, Check, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { isValidInstagramHandle } from "@/lib/instagram";
import { t } from "@/lib/i18n";

const STORE_LOCATIONS = [
  {
    key: "annaba",
    cityFr: "Annaba",
    cityAr: "عنابة",
    phoneDisplay: "0775310235",
    phoneIntl: "+213775310235",
    mapUrl: "https://maps.app.goo.gl/E7sD3wZqvcijqR9u6?g_st=atm",
  },
  {
    key: "guelma",
    cityFr: "Guelma",
    cityAr: "قالمة",
    phoneDisplay: "0562078321",
    phoneIntl: "+213562078321",
    mapUrl: "https://maps.app.goo.gl/mzECX7QDvqZtRubb6?g_st=atm",
  },
];

export default function ContactPage() {
  const { lang } = useLanguage();
  const tr = t(lang);
  const [form, setForm] = useState({ name: "", instagram: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidInstagramHandle(form.instagram)) {
      alert(tr.contact.instagramError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          instagramHandle: form.instagram.trim() || null,
          phone: form.phone,
          message: form.message,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setForm({ name: "", instagram: "", phone: "", message: "" });
    } catch {
      alert(tr.contact.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-10 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">Zella Luxe</span>
        <h1 className="font-display mt-3 text-3xl font-medium sm:text-4xl"><span className="italic text-[#8b6914]">{tr.contact.title}</span></h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.contact.subtitle}</p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <Check className="mx-auto mb-4 text-green-400" size={40} />
          <p className="font-medium text-green-300">{tr.contact.success}</p>
          <button type="button" onClick={() => setSent(false)} className="mt-4 text-sm text-green-400 underline">
            {lang === "fr" ? "Envoyer un autre message" : "إرسال رسالة أخرى"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 md:p-8">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">{tr.contact.name}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c] focus:shadow-[0_0_15px_rgba(201,168,108,0.2)]"
            />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{tr.contact.instagram}</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder={tr.contact.instagramPlaceholder}
                dir="ltr"
                className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c] focus:shadow-[0_0_15px_rgba(201,168,108,0.2)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tr.contact.phone}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c] focus:shadow-[0_0_15px_rgba(201,168,108,0.2)]"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium">{tr.contact.message}</label>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-xl border border-[#a07d3e]/20 bg-[#fffaf2]/70 px-4 py-2.5 text-[#3d2b1f] outline-none focus:border-[#c9a86c] focus:shadow-[0_0_15px_rgba(201,168,108,0.2)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] py-4 text-sm uppercase tracking-wider text-[#1a130a] transition hover:shadow-[0_0_25px_rgba(201,168,108,0.5)] disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? "..." : tr.contact.send}
          </button>
        </form>
      )}

      <div className="mt-14">
        <div className="mb-6 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">
            {lang === "fr" ? "Nos boutiques" : "متاجرنا"}
          </span>
          <h2 className="font-display mt-2 text-2xl font-medium sm:text-3xl">
            {lang === "fr" ? (
              <>Venez nous <span className="italic text-[#8b6914]">rendre visite</span></>
            ) : (
              <><span className="italic text-[#8b6914]">تفضلوا</span> بزيارتنا</>
            )}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {STORE_LOCATIONS.map((store) => (
            <div key={store.key} className="glass-card flex flex-col rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#c9a86c]" />
                <h3 className="font-display text-lg font-medium text-[#4d3525]">Zella Luxe</h3>
              </div>
              <p className="mt-1 text-sm font-light tracking-wide text-[#806f60]">
                {lang === "fr" ? store.cityFr : store.cityAr}
              </p>

              <a
                href={`tel:${store.phoneIntl}`}
                dir="ltr"
                className="mt-4 flex items-center gap-2 text-sm text-[#4d3525] transition hover:text-[#c9a86c]"
              >
                <Phone size={16} className="text-[#c9a86c]" />
                {store.phoneDisplay}
              </a>

              <a
                href={store.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#c9a86c]/45 bg-[#c9a86c]/12 px-4 py-2.5 text-xs uppercase tracking-wider text-[#8b6914] transition hover:bg-[#c9a86c]/22"
              >
                <MapPin size={15} />
                {lang === "fr" ? "Voir sur la carte" : "عرض على الخريطة"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
