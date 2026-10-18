"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  image: string | null;
  variant: string | null;
  quantity: number;
  availability: "available" | "temporarily_unavailable" | "made_to_order";
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotalKobo: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, variant: string | null, quantity: number) => void;
  removeItem: (productId: string, variant: string | null) => void;
  clear: () => void;
};

const STORAGE_KEY = "corazon-empire.cart.v1";
const MAX_QUANTITY = 20;
const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: Pick<CartItem, "productId" | "variant">, productId: string, variant: string | null) {
  return a.productId === productId && (a.variant ?? null) === (variant ?? null);
}

function sanitise(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items: CartItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<CartItem>;
    if (
      typeof item.productId !== "string" ||
      typeof item.slug !== "string" ||
      typeof item.name !== "string" ||
      typeof item.priceKobo !== "number" ||
      !Number.isSafeInteger(item.priceKobo) ||
      item.priceKobo <= 0 ||
      !Number.isSafeInteger(item.quantity) ||
      (item.quantity ?? 0) < 1 ||
      (item.quantity ?? 0) > MAX_QUANTITY
    ) {
      continue;
    }
    items.push({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      priceKobo: item.priceKobo,
      image: typeof item.image === "string" ? item.image : null,
      variant: typeof item.variant === "string" && item.variant.length <= 60 ? item.variant : null,
      quantity: item.quantity as number,
      availability:
        item.availability === "temporarily_unavailable" || item.availability === "made_to_order"
          ? item.availability
          : "available",
    });
  }
  return items;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Hydrating from localStorage must happen after mount to avoid SSR mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setItems(sanitise(JSON.parse(stored)));
    } catch {
      // Corrupt storage is treated as an empty cart.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be unavailable (private mode); the in-memory cart still works.
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const qty = Math.min(Math.max(Math.trunc(quantity), 1), MAX_QUANTITY);
    setItems((current) => {
      const existing = current.find((line) => sameLine(line, item.productId, item.variant));
      if (existing) {
        return current.map((line) =>
          sameLine(line, item.productId, item.variant)
            ? { ...line, quantity: Math.min(line.quantity + qty, MAX_QUANTITY) }
            : line,
        );
      }
      return [...current, { ...item, quantity: qty }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, variant: string | null, quantity: number) => {
    setItems((current) => {
      if (quantity < 1) return current.filter((line) => !sameLine(line, productId, variant));
      const qty = Math.min(Math.trunc(quantity), MAX_QUANTITY);
      return current.map((line) =>
        sameLine(line, productId, variant) ? { ...line, quantity: qty } : line,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string, variant: string | null) => {
    setItems((current) => current.filter((line) => !sameLine(line, productId, variant)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    return {
      items,
      hydrated,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotalKobo: items.reduce((total, item) => total + item.priceKobo * item.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [items, hydrated, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
