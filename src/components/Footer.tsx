"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { SocialLinks } from "@/components/SocialLinks";
import { SiteLogo } from "@/components/SiteLogo";

type SocialProps = {
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
};

export function Footer({ social }: { social: SocialProps }) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const tr = t(lang);
  const year = new Date().getFullYear();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-[#a07d3e]/20 bg-[#fffaf2]/55 pb-[calc(4.5rem+env(safe-area-inset-bottom))] backdrop-blur-lg lg:pb-0">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#c9a86c]/12" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-12 flex flex-col items-center text-center">
          <SiteLogo variant="footer" linked={false} showText={false} className="mx-auto" />
          <p className="mt-4 font-display text-xl font-medium tracking-[0.28em] text-[#5a402c]">ZELLA LUXE</p>
          <SocialLinks
            instagram={social.instagram}
            facebook={social.facebook}
            tiktok={social.tiktok}
            whatsapp={social.whatsapp}
            size={22}
            className="mt-6"
          />
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-sm leading-relaxed text-[#806f60]">
              {lang === "fr"
                ? "Talons, chaussures, sacs, valises et pochettes pour femmes. Luxe, style & attitude."
                : "كعب عالي، أحذية، حقائب، حقائب سفر ومحافظ نسائية. فخامة وأناقة."}
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c9a86c]">
              {lang === "fr" ? "Navigation" : "التنقل"}
            </h4>
            <div className="flex flex-col gap-2 text-sm text-[#806f60]">
              <Link href="/catalogue" className="transition hover:text-[#c9a86c]">{tr.nav.catalogue}</Link>
              <Link href="/promotions" className="transition hover:text-[#c9a86c]">{tr.nav.promotions}</Link>
              <Link href="/avis" className="transition hover:text-[#c9a86c]">{tr.nav.reviews}</Link>
              <Link href="/galerie" className="transition hover:text-[#c9a86c]">{tr.nav.gallery}</Link>
              <Link href="/contact" className="transition hover:text-[#c9a86c]">{tr.nav.contact}</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c9a86c]">
              {lang === "fr" ? "Contact" : "اتصل بنا"}
            </h4>
            <div className="flex flex-col gap-3 text-sm text-[#806f60]">
              <a href="tel:+213775310235" dir="ltr" className="flex items-center gap-2 transition hover:text-[#c9a86c]">
                <Phone size={16} /> {lang === "fr" ? "Annaba" : "عنابة"} · 0775310235
              </a>
              <a href="tel:+213562078321" dir="ltr" className="flex items-center gap-2 transition hover:text-[#c9a86c]">
                <Phone size={16} /> {lang === "fr" ? "Guelma" : "قالمة"} · 0562078321
              </a>
              <a
                href="https://maps.app.goo.gl/E7sD3wZqvcijqR9u6?g_st=atm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-[#c9a86c]"
              >
                <MapPin size={16} /> {lang === "fr" ? "Boutique Annaba" : "متجر عنابة"}
              </a>
              <a
                href="https://maps.app.goo.gl/mzECX7QDvqZtRubb6?g_st=atm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-[#c9a86c]"
              >
                <MapPin size={16} /> {lang === "fr" ? "Boutique Guelma" : "متجر قالمة"}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="relative border-t border-[#a07d3e]/12 py-4 text-center text-xs text-[#806f60]">
        © {year} Zella Luxe — {tr.footer.rights}
      </div>
    </footer>
  );
}
