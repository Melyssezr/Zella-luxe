"use client";

import { useEffect, useRef } from "react";

type TrackProductViewProps = {
  productId: string;
  onCounted?: (viewCount: number) => void;
};

/**
 * Increments product views once per browser session (sessionStorage)
 * and once per 30 min server-side (httpOnly cookie) to avoid refresh inflation.
 * Server no longer returns viewCount (DB-light) — bump optimistically when counted.
 */
export function TrackProductView({ productId, onCounted }: TrackProductViewProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (!productId || sent.current) return;

    const storageKey = `zl-viewed:${productId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      /* private mode — still try API (cookie dedup applies) */
    }

    sent.current = true;

    fetch(`/api/products/${productId}/view`, {
      method: "POST",
      credentials: "same-origin",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { counted?: boolean; viewCount?: number } | null) => {
        try {
          sessionStorage.setItem(storageKey, "1");
        } catch {
          /* ignore */
        }
        if (typeof data?.viewCount === "number") {
          onCounted?.(data.viewCount);
        } else if (data?.counted) {
          onCounted?.(-1); // signal optimistic +1 to parent
        }
      })
      .catch(() => {
        sent.current = false;
      });
  }, [productId, onCounted]);

  return null;
}
