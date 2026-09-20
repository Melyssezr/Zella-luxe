"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { getColorLabel, hexFromColorName, type ProductColor } from "@/lib/utils";
import { t } from "@/lib/i18n";

type ColorSwatchesProps = {
  colors: ProductColor[];
  selected: number;
  onSelect: (index: number) => void;
  size?: "sm" | "md";
};

export function ColorSwatches({ colors, selected, onSelect, size = "md" }: ColorSwatchesProps) {
  const { lang } = useLanguage();
  const tr = t(lang);
  const thumb = size === "sm" ? "h-8 w-8" : "h-14 w-14";

  if (colors.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-[#4d3525]">
        {tr.catalogue.color}: <span className="text-[#c9a86c]">{getColorLabel(colors[selected], lang)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <button
            key={`${color.nameFr}-${color.hex ?? ""}-${color.image ?? ""}-${i}`}
            type="button"
            onClick={() => onSelect(i)}
            title={getColorLabel(color, lang)}
            className={`relative ${thumb} overflow-hidden rounded-full border-2 transition ${
              selected === i
                ? "border-[#c9a86c] shadow-[0_0_12px_rgba(201,168,108,0.5)]"
                : "border-[#a07d3e]/25 hover:border-[#c9a86c]/60"
            }`}
          >
            {color.image ? (
              <Image src={color.image} alt={getColorLabel(color, lang)} fill className="object-cover" sizes="56px" unoptimized={color.image.startsWith("data:")} />
            ) : (
              <span
                className="absolute inset-0"
                style={{ backgroundColor: color.hex || hexFromColorName(color.nameFr, "#888888") }}
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
