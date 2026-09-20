"use client";

import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";

type OrderSummaryProps = {
  subtotal: number;
  shippingCost: number;
  showShippingPlaceholder?: boolean;
};

export function OrderSummary({ subtotal, shippingCost, showShippingPlaceholder }: OrderSummaryProps) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const total = subtotal + shippingCost;

  return (
    <div className="luxe-neon-frame rounded-2xl bg-[#fffaf2]/75 p-6 backdrop-blur-xl">
      <h2 className="font-display mb-4 text-lg font-medium text-[#4d3525]">{tr.checkout.summary}</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-[#806f60]">
          <span>{tr.checkout.productsSubtotal}</span>
          <span className="font-medium text-[#4d3525]">{formatPrice(subtotal, lang)}</span>
        </div>
        <div className="flex justify-between text-[#806f60]">
          <span>{tr.checkout.shippingCost}</span>
          <span className="font-medium text-[#4d3525]">
            {showShippingPlaceholder && shippingCost === 0
              ? tr.checkout.selectWilayaShipping
              : formatPrice(shippingCost, lang)}
          </span>
        </div>
        <div className="border-t border-[#a07d3e]/15 pt-3">
          <div className="flex justify-between text-base font-semibold">
            <span className="text-[#4d3525]">{tr.checkout.grandTotal}</span>
            <span className="font-display text-xl neon-text-gold">{formatPrice(total, lang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
