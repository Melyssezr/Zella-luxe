"use client";

import { Star } from "lucide-react";

export function StarRating({
  rating,
  max = 5,
  size = 18,
  interactive = false,
  onChange,
}: {
  rating: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rating;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={interactive ? "cursor-pointer transition hover:scale-110" : "cursor-default"}
          >
            <Star
              size={size}
              className={filled ? "fill-[#ffd700] text-[#ffd700]" : "text-[#4a4a5a]"}
            />
          </button>
        );
      })}
    </div>
  );
}
