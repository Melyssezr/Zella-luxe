"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Footprints,
  ShoppingBag,
  Wallet,
  Luggage,
  Glasses,
  Heart,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { splashAssets } from "@/lib/images";

const categoryIcons = [Footprints, ShoppingBag, Wallet, Luggage, Glasses];

const SPLASH_PROGRESS_MS = 3500;
const SPLASH_EXIT_MS = 900;
const SPLASH_FALLBACK_BUFFER_MS = 200;

function isSplashAnimation(e: React.AnimationEvent, name: string) {
  return e.target === e.currentTarget && e.animationName.includes(name);
}

export function SplashScreen() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const tr = t(lang);
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");
  const overlayRef = useRef<HTMLDivElement>(null);
  const exitStartedRef = useRef(false);

  const skip = pathname.startsWith("/admin");

  const startExit = useCallback(() => {
    setPhase((current) => (current === "enter" ? "exit" : current));
  }, []);

  const finishSplash = useCallback(() => {
    setPhase("done");
  }, []);

  const handleProgressAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (!isSplashAnimation(e, "splash-progress")) return;
      startExit();
    },
    [startExit],
  );

  const handleOverlayAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (!isSplashAnimation(e, "splash-overlay-out")) return;
      finishSplash();
    },
    [finishSplash],
  );

  useEffect(() => {
    if (skip) {
      setPhase("done");
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [skip]);

  useEffect(() => {
    if (skip || phase !== "enter") return;

    const fallback = window.setTimeout(
      startExit,
      SPLASH_PROGRESS_MS + SPLASH_FALLBACK_BUFFER_MS,
    );

    return () => window.clearTimeout(fallback);
  }, [skip, phase, startExit]);

  useEffect(() => {
    if (skip || phase !== "exit") {
      exitStartedRef.current = false;
      return;
    }

    if (exitStartedRef.current) return;
    exitStartedRef.current = true;

    const overlay = overlayRef.current;
    const onNativeEnd = (e: AnimationEvent) => {
      if (e.target !== overlay || !e.animationName.includes("splash-overlay-out")) {
        return;
      }
      finishSplash();
    };

    overlay?.addEventListener("animationend", onNativeEnd);

    const fallback = window.setTimeout(
      finishSplash,
      SPLASH_EXIT_MS + SPLASH_FALLBACK_BUFFER_MS,
    );

    return () => {
      overlay?.removeEventListener("animationend", onNativeEnd);
      window.clearTimeout(fallback);
    };
  }, [skip, phase, finishSplash]);

  if (skip || phase === "done") return null;

  return (
    <div
      ref={overlayRef}
      className={`splash-overlay fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col ${
        phase === "exit" ? "splash-overlay-exit" : "splash-overlay-enter"
      }`}
      role="presentation"
      aria-hidden={phase === "exit"}
      onAnimationEnd={handleOverlayAnimationEnd}
    >
      <div className="splash-bg-mobile-wrap absolute inset-0 overflow-hidden md:hidden">
        <Image
          src={splashAssets.backgroundMobile}
          alt=""
          fill
          priority
          className="splash-bg-image-mobile"
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 hidden overflow-hidden md:block">
        <Image
          src={splashAssets.background}
          alt=""
          fill
          priority
          className="splash-bg-image"
          sizes="100vw"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[#1a0f28]/5 md:bg-[#1a0f28]/15" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0d]/60 md:to-[#0a0a0d]/70" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center pt-[env(safe-area-inset-top)] md:justify-center md:pb-[env(safe-area-inset-bottom)]">
        <div className="mt-auto flex w-full flex-col items-center px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-4 md:mt-0 md:translate-y-[15vh] md:pb-0">
          <div
            className={`splash-card splash-card-modele w-full max-w-[15.5rem] sm:max-w-[17rem] md:max-w-[20rem] ${
              phase === "exit" ? "splash-card-exit" : ""
            }`}
          >
            <div className="absolute -inset-px rounded-xl bg-gradient-to-b from-[#d4af37]/75 via-[#a8873a]/45 to-[#c9a84c]/40" />
            <div className="relative flex flex-col items-center rounded-[0.7rem] border border-[#c9a84c]/45 bg-[#1a1028]/78 px-3.5 py-3.5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:px-4 sm:py-4 md:bg-[#1a1028]/85 md:backdrop-blur-md">
              <p
                className={`splash-welcome-title splash-gold-script text-[1.65rem] leading-none sm:text-[1.85rem] md:text-[2.35rem] ${
                  lang === "ar" ? "font-[family-name:var(--font-arabic)] font-semibold not-italic" : ""
                }`}
              >
                {tr.splash.welcome}
              </p>

              <div className="my-2 h-px w-12 bg-gradient-to-r from-transparent via-[#c9a84c]/70 to-transparent" />

              <p className="splash-tagline line-clamp-2 text-[10px] leading-snug text-white/90 sm:text-[11px]">
                {tr.splash.message}{" "}
                <span className="font-semibold splash-gold-text">{tr.splash.brandHighlight}</span>.
              </p>

              <div className="splash-icons mt-2.5 flex items-center justify-center gap-2.5 sm:gap-3">
                {categoryIcons.map((Icon, i) => (
                  <Icon key={i} size={16} strokeWidth={1.5} className="text-[#c9a84c] md:hidden" />
                ))}
                {categoryIcons.map((Icon, i) => (
                  <Icon key={`md-${i}`} size={18} strokeWidth={1.5} className="hidden text-[#c9a84c] md:block" />
                ))}
              </div>

              <p className="splash-tagline mt-2 text-[9px] font-semibold leading-tight splash-gold-text sm:text-[10px] md:text-[11px]">
                {tr.splash.values}
              </p>
              <p className="splash-tagline mt-1 hidden text-[9px] leading-tight text-white/75 sm:block sm:text-[10px]">
                {tr.splash.subtitle}
              </p>

              <div className="splash-tagline mt-2.5 w-full md:mt-3.5">
                <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c9a84c]/20 bg-[#0d0812]/65 px-2 py-1.5 text-[8px] leading-tight text-white/85 sm:text-[9px] md:py-2 md:text-[10px]">
                  <Heart size={8} className="shrink-0 fill-[#c9a86c] text-[#c9a86c]" />
                  <span className="splash-gold-text line-clamp-1">{tr.splash.footer}</span>
                  <Heart size={8} className="shrink-0 fill-[#c9a86c] text-[#c9a86c]" />
                </div>
              </div>
            </div>
          </div>

          <div className="splash-loading mt-4 w-full max-w-[15.5rem] px-1 sm:mt-5 sm:max-w-[17rem] md:mt-5 md:max-w-[20rem]">
            <p className="mb-1.5 text-center text-[10px] tracking-[0.2em] text-white/75 sm:text-[11px]">
              {tr.splash.loading}
            </p>
            <div className="mx-auto h-0.5 max-w-[11rem] overflow-hidden rounded-full bg-white/15 sm:max-w-xs md:max-w-md md:h-1">
              <div
                className="splash-progress-bar h-full rounded-full bg-gradient-to-r from-[#8a6f2e] via-[#c9a84c] to-[#e2c875]"
                onAnimationEnd={handleProgressAnimationEnd}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
