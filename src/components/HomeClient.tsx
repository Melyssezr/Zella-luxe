"use client";

import Link from "next/link";
import Image from "next/image";
import { Tag } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { catalogLabel, catalogCoverImage, type CatalogRecord } from "@/lib/categories";
import { Hero } from "@/components/Hero";
import { ProductCard, CategoryCard } from "@/components/ProductCard";
import { ReviewsSection } from "@/components/ReviewsSection";
import { TrustBar } from "@/components/TrustBar";

type HomeProduct = React.ComponentProps<typeof ProductCard>;
type HomeReviews = React.ComponentProps<typeof ReviewsSection>["reviews"];
type GalleryImage = { id: string; url: string; captionFr: string | null };

export function HomeClient({
  featured,
  promos,
  gallery,
  reviews,
  catalogs,
}: {
  featured: HomeProduct[];
  promos: HomeProduct[];
  gallery: GalleryImage[];
  reviews: HomeReviews;
  catalogs: CatalogRecord[];
}) {
  const { lang } = useLanguage();
  const tr = t(lang);

  return (
    <>
      <Hero />
      <TrustBar />

      {/* Marquee */}
      <div className="overflow-hidden border-y border-[#a07d3e]/15 bg-[#fffaf2]/45 py-4 backdrop-blur-sm">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="mx-8 text-xs font-light uppercase tracking-[0.55em] text-[#806f60]">
              {tr.home.marquee.map((word) => (
                <span key={word}>
                  {word}
                  <span className="mx-3 text-[#c9a86c]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Promotions */}
      {promos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="mb-12 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#8b6914]">
                <Tag size={13} />
                {tr.home.promoEyebrow}
              </span>
              <h2 className="font-display mt-4 text-3xl font-medium text-[#4d3525] md:text-5xl">
                {tr.home.promoTitleLead}{" "}
                <span className="italic text-[#8b6914]">{tr.home.promoTitleAccent}</span>
              </h2>
              <p className="mt-3 text-sm tracking-wide text-[#806f60]">{tr.home.promoSubtitle}</p>
            </div>
            <Link href="/promotions" className="btn-neon-outline rounded-full px-8 py-3 text-sm font-semibold uppercase">
              {tr.home.seeAllPromos}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {promos.map((product) => (
              <ProductCard key={product.id} {...product} catalogs={catalogs} />
            ))}
          </div>
        </section>
      )}

      {/* Categories / Catalogues */}
      {catalogs.length > 0 && (
        <section className="section-glow luxe-neon-frame mx-4 my-8 max-w-7xl rounded-[2rem] bg-[#fffaf2]/28 px-4 py-16 backdrop-blur-sm md:mx-6 md:px-6 lg:mx-auto">
          <div className="mb-12 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">
              {tr.home.catEyebrow}
            </span>
            <h2 className="font-display mt-3 text-3xl font-medium text-[#4d3525] md:text-5xl">
              {tr.home.catTitleLead}{" "}
              <span className="italic text-[#8b6914]">{tr.home.catTitleAccent}</span>
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
            {catalogs.map((cat) => (
              <div key={cat.id} className="w-48 shrink-0 md:w-60">
                <CategoryCard
                  href={`/catalogue?category=${cat.slug}`}
                  image={catalogCoverImage(cat)}
                  label={catalogLabel(cat, lang)}
                  accent={cat.accentColor}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.home.featuredEyebrow}</span>
          <h2 className="font-display mt-3 text-3xl font-medium text-[#4d3525] md:text-5xl">
            {tr.home.featuredTitleLead}{" "}
            <span className="italic text-[#8b6914]">{tr.home.featuredTitleAccent}</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} {...product} catalogs={catalogs} />
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href="/catalogue" className="btn-neon inline-block rounded-full px-10 py-4 text-sm">
            {tr.home.seeAllCatalogue}
          </Link>
        </div>
      </section>

      {/* Reviews */}
      <ReviewsSection reviews={reviews} />

      {/* Lookbook strip */}
      <section className="overflow-hidden py-16">
        <div className="mb-8 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.home.lookbookEyebrow}</span>
          <h2 className="font-display mt-3 text-2xl font-medium text-[#4d3525] md:text-3xl">
            {tr.home.lookbookTitleLead}{" "}
            <span className="italic text-[#8b6914]">{tr.home.lookbookTitleAccent}</span>
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 md:px-6">
          {gallery.map((img) => (
            <div
              key={img.id}
              className="relative h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-[#c9a86c]/25 shadow-[0_10px_30px_rgba(89,58,30,0.16)] md:h-80 md:w-60"
            >
              <Image src={img.url} alt={img.captionFr ?? ""} fill className="object-cover" sizes="240px" />
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/galerie" className="btn-neon-outline inline-block rounded-full px-8 py-3 text-sm font-semibold uppercase">
            {tr.home.seeGallery}
          </Link>
        </div>
      </section>
    </>
  );
}
