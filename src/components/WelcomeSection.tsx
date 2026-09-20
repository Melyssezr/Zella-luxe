"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { designAssets } from "@/lib/images";
import { Sparkles } from "lucide-react";

export function WelcomeSection() {
  const { lang } = useLanguage();
  const tr = t(lang);

  return (
    <section className="relative mx-4 my-12 overflow-hidden rounded-3xl border border-[#c9a86c]/15 md:mx-6 lg:mx-auto lg:max-w-7xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf2]/80 via-[#f8eddd]/72 to-[#c9a86c]/16 backdrop-blur-md" />
      <div className="relative grid items-center gap-8 p-8 md:grid-cols-2 md:p-12 lg:p-16">
        <div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c9a86c]/30 bg-[#c9a86c]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#c9a86c]">
            <Sparkles size={12} />
            Zella Luxe
          </span>
          <h2 className="hero-title text-3xl font-bold md:text-4xl lg:text-5xl">
            <span className="hero-title-gradient block">{tr.welcome.title}</span>
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#806f60]">{tr.welcome.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalogue" className="btn-neon rounded-full px-6 py-3 text-sm">
              {tr.welcome.ctaShop}
            </Link>
            <Link href="/promotions" className="btn-neon-outline rounded-full px-6 py-3 text-sm font-semibold uppercase">
              {tr.welcome.ctaPromo}
            </Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-[#c9a86c]/30 shadow-[0_20px_50px_rgba(89,58,30,0.18)]">
          <Image
            src={designAssets.instagramBanner}
            alt=""
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d]/60 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
