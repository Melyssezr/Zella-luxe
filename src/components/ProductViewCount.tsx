import { Eye } from "lucide-react";

type ProductViewCountProps = {
  count: number;
  className?: string;
  iconSize?: number;
};

/** Public view counter — eye icon + count (storefront only). */
export function ProductViewCount({
  count,
  className = "",
  iconSize = 14,
}: ProductViewCountProps) {
  const safe = Math.max(0, Math.floor(count || 0));
  const formatted = new Intl.NumberFormat("fr-DZ").format(safe);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[#806f60] ${className}`}
      title={`${formatted} vues`}
      aria-label={`${formatted} vues`}
    >
      <Eye size={iconSize} className="shrink-0 opacity-80" aria-hidden />
      <span className="tabular-nums">{formatted}</span>
    </span>
  );
}
