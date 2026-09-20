"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Tag, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

const items = [
  { href: "/", icon: Home, labelKey: "home" as const },
  { href: "/catalogue", icon: LayoutGrid, labelKey: "catalogue" as const },
  { href: "/promotions", icon: Tag, labelKey: "promotions" as const },
  { href: "/panier", icon: ShoppingBag, labelKey: "cart" as const },
  { href: "/contact", icon: MessageCircle, labelKey: "contact" as const },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count, additionSignal } = useCart();
  const { lang } = useLanguage();
  const tr = t(lang);

  if (pathname.startsWith("/admin")) return null;

  const labels = {
    home: tr.nav.home,
    catalogue: tr.nav.catalogue,
    promotions: tr.nav.promotions,
    cart: tr.nav.cart,
    contact: tr.nav.contact,
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#a07d3e]/20 bg-[#fffaf2]/90 shadow-[0_-6px_24px_rgba(89,58,30,0.08)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navigation mobile"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, icon: Icon, labelKey }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          const isCart = href === "/panier";

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex w-full max-w-[4.25rem] flex-col items-center gap-0.5 px-0.5 py-2.5 text-[9px] font-semibold uppercase leading-tight tracking-wide transition sm:text-[10px] ${
                active ? "text-[#a07d3e]" : "text-[#806f60] hover:text-[#5a402c]"
              }`}
            >
              <span
                key={isCart ? additionSignal : href}
                className={`relative ${isCart && additionSignal > 0 ? "animate-bounce" : ""}`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {isCart && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[9px] font-bold text-[#1a130a]">
                    {count}
                  </span>
                )}
              </span>
              <span className="truncate">{labels[labelKey]}</span>
              {active && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
