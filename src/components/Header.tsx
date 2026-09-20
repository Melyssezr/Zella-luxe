"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { SocialLinks } from "./SocialLinks";
import { SiteLogo } from "./SiteLogo";

type SocialProps = {
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
};

export function Header({ social }: { social: SocialProps }) {
  const { count, additionSignal } = useCart();
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist();
  const { lang } = useLanguage();
  const tr = t(lang);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: tr.nav.home },
    { href: "/catalogue", label: tr.nav.catalogue },
    { href: "/promotions", label: tr.nav.promotions },
    { href: "/avis", label: tr.nav.reviews },
    { href: "/galerie", label: tr.nav.gallery },
    { href: "/contact", label: tr.nav.contact },
  ];

  const mobileLinks = [...links, { href: "/favoris", label: tr.wishlist.nav }];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#a07d3e]/20 bg-[#fffaf2]/82 shadow-[0_6px_24px_rgba(89,58,30,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 md:px-6 md:py-3">
          <SiteLogo variant="header" className="min-w-0" />

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition xl:px-4 xl:text-xs ${
                  pathname === link.href
                    ? "bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[#1a130a] shadow-[0_2px_12px_rgba(201,168,108,0.3)]"
                    : "text-[#6f5a49] hover:bg-[#c9a86c]/10 hover:text-[#6c4c25]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageToggle />
            <SocialLinks
              instagram={social.instagram}
              facebook={social.facebook}
              tiktok={social.tiktok}
              whatsapp={social.whatsapp}
              size={18}
              className="hidden sm:flex"
            />
            <Link
              href="/favoris"
              className="relative rounded-full p-2 text-[#5a402c] transition hover:bg-[#c9a86c]/12"
              aria-label={tr.wishlist.nav}
            >
              <Heart size={22} />
              {wishlistHydrated && wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[10px] font-bold text-[#1a130a] shadow-[0_2px_8px_rgba(201,168,108,0.5)]">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href="/panier"
              className="relative rounded-full p-2 text-[#5a402c] transition hover:bg-[#c9a86c]/12"
              aria-label={tr.nav.cart}
            >
              <span
                key={additionSignal}
                className={additionSignal > 0 ? "block animate-bounce" : "block"}
              >
                <ShoppingBag size={22} />
              </span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[10px] font-bold text-[#1a130a] shadow-[0_2px_8px_rgba(201,168,108,0.5)]">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="rounded-full border border-[#a07d3e]/20 bg-white/50 p-2 text-[#5a402c] lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#3d2b1f]/35 backdrop-blur-sm"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute left-0 right-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-[#c9a86c]/30 bg-[#fffaf2]/95 shadow-[0_20px_60px_rgba(89,58,30,0.24)] backdrop-blur-xl"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-[#a07d3e]/15 px-4 py-3">
              <SiteLogo variant="header" linked={false} />
              <button
                type="button"
                className="rounded-full border border-[#a07d3e]/20 bg-white/55 p-2 text-[#5a402c]"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-col gap-1 px-4 py-4">
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-sm font-semibold uppercase tracking-wider transition ${
                    pathname === link.href
                      ? "bg-gradient-to-r from-[#c9a86c]/20 to-[#a07d3e]/20 text-[#e4cf9a]"
                      : "text-[#6f5a49] hover:bg-[#c9a86c]/10 hover:text-[#5a402c]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-[#a07d3e]/15 px-4 py-5">
              <p className="mb-3 text-center text-xs uppercase tracking-wider text-[#806f60]">
                {lang === "fr" ? "Suivez-nous" : "تابعونا"}
              </p>
              <div className="flex justify-center">
                <SocialLinks
                  instagram={social.instagram}
                  facebook={social.facebook}
                  tiktok={social.tiktok}
                  whatsapp={social.whatsapp}
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
