"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

export function CartExperience() {
  const pathname = usePathname();
  const {
    count,
    hydrated,
    additionSignal,
    dismissAdditionNotice,
  } = useCart();
  const { lang } = useLanguage();

  useEffect(() => {
    if (additionSignal === 0) return;
    const timeout = window.setTimeout(dismissAdditionNotice, 6500);
    return () => window.clearTimeout(timeout);
  }, [additionSignal, dismissAdditionNotice]);

  if (pathname.startsWith("/admin")) return null;

  const toastText =
    lang === "ar"
      ? "تمت إضافة المنتج إلى السلة. اضغطي على السلة لإتمام طلبك، وبعد إرساله سيكون في انتظار التأكيد."
      : "Produit ajouté au panier. Appuyez sur le panier pour finaliser votre commande. Après l’envoi, elle sera en attente de confirmation.";
  const checkoutLabel = lang === "ar" ? "إتمام طلبي" : "Finaliser ma commande";

  return (
    <>
      {additionSignal > 0 && (
        <div
          key={additionSignal}
          className="fixed left-3 right-3 top-20 z-[90] mx-auto max-w-xl animate-[cart-toast-in_350ms_ease-out] rounded-2xl border border-emerald-300/70 bg-[#fffdf8]/95 p-4 shadow-[0_16px_45px_rgba(47,33,23,0.24)] backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={23} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-relaxed text-[#4d3525]">{toastText}</p>
              <Link
                href="/panier"
                onClick={dismissAdditionNotice}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#8b6914] underline-offset-4 hover:underline"
              >
                <ShoppingBag size={16} />
                {checkoutLabel}
              </Link>
            </div>
            <button
              type="button"
              onClick={dismissAdditionNotice}
              className="rounded-full p-1 text-[#806f60] transition hover:bg-[#c9a86c]/12"
              aria-label={lang === "ar" ? "إغلاق" : "Fermer"}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {hydrated && count > 0 && pathname !== "/panier" && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] md:bottom-6 md:left-auto md:right-6 md:w-[25rem]">
          <Link
            href="/panier"
            className="flex w-full animate-[cart-cta-pulse_2.2s_ease-in-out_infinite] items-center justify-center gap-3 rounded-2xl border border-[#f2d98b] bg-gradient-to-r from-[#8b6914] via-[#b58a24] to-[#8b6914] px-5 py-4 text-base font-bold text-white shadow-[0_10px_35px_rgba(89,58,30,0.38)] transition hover:scale-[1.02] hover:shadow-[0_14px_40px_rgba(89,58,30,0.45)]"
          >
            <span key={additionSignal} className={additionSignal > 0 ? "animate-bounce" : ""}>
              <ShoppingBag size={25} />
            </span>
            <span>🛒 {checkoutLabel}</span>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-extrabold text-[#8b6914]">
              {count}
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
