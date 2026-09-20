import type { Metadata } from "next";
import { Playfair_Display, Jost, Noto_Sans_Arabic, Great_Vibes } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getSocialLinks } from "@/lib/settings";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const greatVibes = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Zella Luxe — Maroquinerie & Chaussures",
  description:
    "Zella Luxe : talons, chaussures, sacs, valises et pochettes pour femmes. Élégance, raffinement et sélection d'exception.",
  icons: {
    icon: "/images/logo.jpg",
    apple: "/images/logo.jpg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const social = await getSocialLinks();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${jost.variable} ${notoArabic.variable} ${greatVibes.variable} min-h-full flex flex-col antialiased`}
      >
        <Providers social={social}>{children}</Providers>
      </body>
    </html>
  );
}
