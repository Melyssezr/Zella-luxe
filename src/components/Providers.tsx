"use client";

import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { CartExperience } from "@/components/CartExperience";

type SocialProps = {
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
};

export function Providers({
  children,
  social,
}: {
  children: React.ReactNode;
  social: SocialProps;
}) {
  return (
    <LanguageProvider>
      <CartProvider>
        <WishlistProvider>
          <SplashScreen />
          <Header social={social} />
          <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
          <Footer social={social} />
          <MobileBottomNav />
          <CartExperience />
        </WishlistProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
