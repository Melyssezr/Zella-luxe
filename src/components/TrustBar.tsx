"use client";

import { Truck, Wallet, RefreshCw, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export function TrustBar() {
  const { lang } = useLanguage();
  const tr = t(lang);

  const items = [
    { icon: Truck, label: tr.trust.delivery },
    { icon: Wallet, label: tr.trust.payment },
    { icon: RefreshCw, label: tr.trust.exchange },
    { icon: ShieldCheck, label: tr.trust.quality },
  ];

  return (
    <section className="border-y border-[#a07d3e]/15 bg-[#fffaf2]/45 backdrop-blur-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-[#c9a86c]/10 px-4 md:grid-cols-4 md:divide-y-0 md:px-6">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-3 px-3 py-5 text-center md:py-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c9a86c]/25 text-[#c9a86c]">
              <Icon size={18} />
            </span>
            <span className="text-xs font-medium tracking-wide text-[#6f5a49] sm:text-sm">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
