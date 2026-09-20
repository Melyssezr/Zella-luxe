"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

type GalleryImage = {
  id: string;
  url: string;
  captionFr: string | null;
  captionAr: string | null;
};

export function GalerieClient({ images }: { images: GalleryImage[] }) {
  const { lang } = useLanguage();
  const tr = t(lang);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mb-12 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.nav.gallery}</span>
        <h1 className="font-display mt-3 text-4xl font-medium md:text-5xl">
          <span className="italic text-[#8b6914]">{tr.gallery.title}</span>
        </h1>
        <p className="mt-3 font-light tracking-wide text-[#806f60]">{tr.gallery.subtitle}</p>
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((img, i) => (
          <figure
            key={img.id}
            className="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[#a07d3e]/20 shadow-[0_8px_28px_rgba(89,58,30,0.09)] transition hover:border-[#c9a86c]/50 hover:shadow-[0_12px_34px_rgba(89,58,30,0.16)]"
          >
            <div className="relative">
              <Image
                src={img.url}
                alt={lang === "fr" ? (img.captionFr ?? "") : (img.captionAr ?? "")}
                width={600}
                height={i % 3 === 0 ? 800 : 600}
                className="w-full object-cover transition duration-500 group-hover:scale-105"
              />
              {(img.captionFr || img.captionAr) && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0a0d] to-transparent p-4 text-sm font-semibold text-white">
                  {lang === "fr" ? img.captionFr : img.captionAr}
                </figcaption>
              )}
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
