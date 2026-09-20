"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getEffectiveSizePrice,
  getProductVariants,
  getSizeBasePrice,
  getVariantStock,
  sizeLabels,
} from "@/lib/variants";

export type CartItem = {
  productId: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  price: number;
  image: string;
  size: string;
  color?: string;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
  hydrated: boolean;
  /** Changes whenever a product is added; used for toast and cart animation. */
  additionSignal: number;
  dismissAdditionNotice: () => void;
  /** Timestamp of last add / remove / quantity change */
  lastActivityAt: number | null;
  /** When the cart will expire (null if empty) */
  expiresAt: number | null;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "zella-luxe-cart";
/** Legacy session flag from the removed expiry banner — cleared on load */
const LEGACY_EXPIRED_NOTICE_KEY = "zella-luxe-cart-expired";
/** Cart stays active for 1 hour after the last cart activity */
export const CART_TTL_MS = 60 * 60 * 1000;
const EXPIRY_CHECK_INTERVAL_MS = 15_000;

type DbProduct = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  price: number;
  promoPrice: number | null;
  onPromo: boolean;
  images: string;
  colors?: string;
  sizes?: string;
  variants?: string | null;
  stock?: number;
  active: boolean;
};

type PersistedCart = {
  items: CartItem[];
  lastActivityAt: number | null;
};

function itemKey(slug: string, size: string, color?: string) {
  return `${slug}::${size}::${color ?? ""}`;
}

function isExpired(lastActivityAt: number | null, now = Date.now()) {
  if (lastActivityAt == null) return false;
  return now - lastActivityAt >= CART_TTL_MS;
}

function parseStoredCart(raw: string | null): PersistedCart {
  if (!raw) return { items: [], lastActivityAt: null };

  try {
    const parsed = JSON.parse(raw);

    // Legacy format: bare CartItem[]
    if (Array.isArray(parsed)) {
      const items = parsed as CartItem[];
      return {
        items,
        lastActivityAt: items.length > 0 ? Date.now() : null,
      };
    }

    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      const items = parsed.items as CartItem[];
      const lastActivityAt =
        typeof parsed.lastActivityAt === "number" && Number.isFinite(parsed.lastActivityAt)
          ? parsed.lastActivityAt
          : items.length > 0
            ? Date.now()
            : null;
      return { items, lastActivityAt };
    }
  } catch {
    // ignore corrupted storage
  }

  return { items: [], lastActivityAt: null };
}

function syncCartItems(stored: CartItem[], products: DbProduct[]): CartItem[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  return stored
    .map((item) => {
      const product = bySlug.get(item.slug);
      if (!product?.active) return null;

      let images: string[] = [];
      try {
        images = JSON.parse(product.images || "[]");
      } catch {
        images = [];
      }

      const variants = getProductVariants({
        price: product.price,
        stock: product.stock ?? 0,
        sizes: product.sizes,
        colors: product.colors,
        variants: product.variants,
      });
      const size = item.size || sizeLabels(variants)[0] || "Unique";
      const available = getVariantStock(variants, size, item.color);
      if (available <= 0) return null;

      const sizePrice = getSizeBasePrice(variants, size, product.price);
      const price = getEffectiveSizePrice(product, sizePrice);

      return {
        ...item,
        productId: product.id,
        nameFr: product.nameFr,
        nameAr: product.nameAr,
        price,
        quantity: Math.min(item.quantity, available),
        image: images[0] ?? item.image,
      };
    })
    .filter((item): item is CartItem => item !== null);
}

function clearLegacyExpiredNotice() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LEGACY_EXPIRED_NOTICE_KEY);
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [additionSignal, setAdditionSignal] = useState(0);
  const persistReady = useRef(false);

  const expireCart = useCallback(() => {
    setItems([]);
    setLastActivityAt(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      clearLegacyExpiredNotice();
      const stored = parseStoredCart(localStorage.getItem(STORAGE_KEY));

      if (stored.items.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLastActivityAt(null);
          setHydrated(true);
          persistReady.current = true;
        }
        return;
      }

      if (isExpired(stored.lastActivityAt)) {
        if (!cancelled) {
          expireCart();
          setHydrated(true);
          persistReady.current = true;
        }
        return;
      }

      try {
        const ids = [
          ...new Set(stored.items.map((i) => i.productId).filter(Boolean)),
        ].slice(0, 40);
        const slugs = [
          ...new Set(stored.items.map((i) => i.slug).filter(Boolean)),
        ].slice(0, 40);
        const qs = new URLSearchParams({ lite: "1" });
        if (ids.length) qs.set("ids", ids.join(","));
        if (slugs.length) qs.set("slugs", slugs.join(","));
        const res = await fetch(`/api/products/by-ids?${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("products fetch failed");
        const products: DbProduct[] = await res.json();
        if (!cancelled) {
          const synced = syncCartItems(stored.items, products);
          setItems(synced);
          setLastActivityAt(synced.length > 0 ? stored.lastActivityAt : null);
          setHydrated(true);
          persistReady.current = true;
        }
      } catch {
        if (!cancelled) {
          setItems(stored.items);
          setLastActivityAt(stored.lastActivityAt);
          setHydrated(true);
          persistReady.current = true;
        }
      }
    }

    loadCart();
    return () => {
      cancelled = true;
    };
  }, [expireCart]);

  useEffect(() => {
    if (!hydrated || !persistReady.current) return;
    const payload: PersistedCart = {
      items,
      lastActivityAt: items.length > 0 ? lastActivityAt : null,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [items, lastActivityAt, hydrated]);

  // Silent 1h inactivity auto-clear (no user-facing notice)
  useEffect(() => {
    if (!hydrated) return;

    const check = () => {
      if (items.length === 0 || lastActivityAt == null) return;
      if (isExpired(lastActivityAt)) expireCart();
    };

    check();
    const id = window.setInterval(check, EXPIRY_CHECK_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydrated, items.length, lastActivityAt, expireCart]);

  const markActivity = useCallback((hasItems: boolean) => {
    setLastActivityAt(hasItems ? Date.now() : null);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) => itemKey(i.slug, i.size, i.color) === itemKey(item.slug, item.size, item.color)
        );
        if (existing) {
          return prev.map((i) =>
            itemKey(i.slug, i.size, i.color) === itemKey(item.slug, item.size, item.color)
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i
          );
        }
        return [...prev, { ...item, quantity: item.quantity ?? 1 }];
      });
      markActivity(true);
      setAdditionSignal((signal) => signal + 1);
    },
    [markActivity]
  );

  const removeItem = useCallback(
    (productId: string, size: string, color?: string) => {
      setItems((prev) => {
        const next = prev.filter(
          (i) =>
            !(
              i.productId === productId &&
              i.size === size &&
              (i.color ?? "") === (color ?? "")
            )
        );
        // Defer so we don't nest setState inside the items updater (Strict Mode safe)
        queueMicrotask(() => markActivity(next.length > 0));
        return next;
      });
    },
    [markActivity]
  );

  const updateQuantity = useCallback(
    (productId: string, size: string, quantity: number, color?: string) => {
      if (quantity <= 0) {
        removeItem(productId, size, color);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId &&
          i.size === size &&
          (i.color ?? "") === (color ?? "")
            ? { ...i, quantity }
            : i
        )
      );
      markActivity(true);
    },
    [removeItem, markActivity]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setLastActivityAt(null);
    setAdditionSignal(0);
  }, []);

  const dismissAdditionNotice = useCallback(() => {
    setAdditionSignal(0);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const expiresAt = useMemo(() => {
    if (items.length === 0 || lastActivityAt == null) return null;
    return lastActivityAt + CART_TTL_MS;
  }, [items.length, lastActivityAt]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        count,
        hydrated,
        additionSignal,
        dismissAdditionNotice,
        lastActivityAt,
        expiresAt,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
