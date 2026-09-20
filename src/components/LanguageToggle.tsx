"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { Lang } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  const toggle = (l: Lang) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition sm:px-3 sm:text-xs ${
        lang === l
          ? "bg-gradient-to-r from-[#e4cf9a] to-[#c9a86c] text-[#1a130a] shadow-[0_0_15px_rgba(201,168,108,0.4)]"
          : "text-[#806f60] hover:text-[#5a402c]"
      }`}
    >
      {l === "fr" ? "FR" : "AR"}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[#a07d3e]/20 bg-white/45 p-0.5">
      {toggle("fr")}
      {toggle("ar")}
    </div>
  );
}
