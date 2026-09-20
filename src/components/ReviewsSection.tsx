"use client";

import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { parseJsonArray } from "@/lib/utils";

type Review = {
  id: string;
  customerName: string;
  message: string;
  rating: number;
  photos: string;
  product?: { nameFr: string; nameAr: string } | null;
};

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const { lang } = useLanguage();
  const tr = t(lang);

  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mb-10 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.45em] text-[#8b6914]">{tr.reviews.title}</span>
          <h2 className="font-display mt-3 text-3xl font-medium text-[#4d3525] md:text-4xl">
            {tr.reviews.subtitle}
          </h2>
        </div>
        <Link href="/avis" className="btn-neon-outline rounded-full px-6 py-2.5 text-sm font-semibold uppercase">
          {tr.reviews.leaveReview}
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const photos = parseJsonArray(review.photos);
          const productName = review.product
            ? lang === "fr"
              ? review.product.nameFr
              : review.product.nameAr
            : null;
          return (
            <article key={review.id} className="glass-card rounded-2xl p-6">
              <StarRating rating={review.rating} />
              <p className="mt-4 text-sm leading-relaxed text-[#6f5a49]">&ldquo;{review.message}&rdquo;</p>
              {photos[0] && (
                <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-[#a07d3e]/15">
                  <Image src={photos[0]} alt="" fill className="object-cover" sizes="300px" />
                </div>
              )}
              <div className="mt-4 border-t border-[#a07d3e]/15 pt-4">
                <p className="font-semibold text-[#4d3525]">{review.customerName}</p>
                {productName && <p className="text-xs text-[#c9a86c]">{productName}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
