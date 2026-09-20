"use client";

import Link from "next/link";
import { designAssets } from "@/lib/images";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export function Hero() {
  const { lang } = useLanguage();
  const tr = t(lang);

  return (
    <section className="relative min-h-[78vh] w-full overflow-hidden sm:min-h-[82vh] md:min-h-[88vh]">
      {/* Full-bleed banner: mobile (pictlf) / desktop-tablet (picpc) */}
      <picture className="absolute inset-0 block h-full w-full">
        <source
          media="(max-width: 767px)"
          srcSet={designAssets.heroMobile}
        />
        <source
          media="(min-width: 768px)"
          srcSet={designAssets.heroDesktop}
        />
        <img
          src={designAssets.heroDesktop}
          alt="Zella Luxe — nouvelle collection"
          className="h-full w-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Soft overlays for text contrast — keep products visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent md:from-black/50 md:via-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25" />

      <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl items-center px-4 py-16 sm:min-h-[82vh] sm:px-6 sm:py-20 md:min-h-[88vh] md:py-24">
        <div
          className={`max-w-xl ${lang === "ar" ? "mr-auto text-right md:mr-0 md:ml-auto" : "text-left"}`}
        >
          <span className="mb-4 inline-block text-[11px] font-medium uppercase tracking-[0.35em] text-white/90 sm:mb-5 sm:tracking-[0.4em]">
            {tr.hero.tagline}
          </span>
          <h1 className="font-display text-[2.15rem] leading-[1.1] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl lg:text-[3.35rem]">
            <span className="block">{tr.hero.titleLine1}</span>
            <span className="mt-1 block italic text-[#f0e0b8] sm:mt-2">{tr.hero.titleLine2}</span>
          </h1>
          <p className="mt-5 max-w-md text-base font-light leading-relaxed tracking-wide text-white/90 sm:mt-6 sm:text-lg">
            {tr.hero.subtitle}
          </p>
          <div
            className={`mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4 ${
              lang === "ar" ? "sm:justify-end" : "sm:justify-start"
            }`}
          >
            <Link
              href="/catalogue"
              className="rounded-md bg-[#c9a86c] px-8 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-[#1a1208] transition hover:bg-[#d4b87a] sm:py-4"
            >
              {tr.hero.cta}
            </Link>
            <Link
              href="/promotions"
              className="rounded-md border border-white/70 bg-white/10 px-8 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20 sm:py-4"
            >
              {tr.hero.cta2}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
