import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OrderService } from "./order-service";

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  options: Record<string, string>;
  selected?: Record<string, number>;
  qty: number;
};

type CartCtx = {
  service: OrderService;
  setService: (service: OrderService) => void;
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "matturo-cart-v1";

export function cartKey(productId: string, options: Record<string, string>) {
  return productId + "|" + Object.keys(options).sort().map((k) => `${k}=${options[k]}`).join("&");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [service, setService] = useState<OrderService>("Retirada");
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<CartCtx>(
    () => ({
      service,
      setService,
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      add: (item, qty = 1) =>
        setItems((prev) => {
          // Every unit is its own line, even for identical dishes.
          const base = cartKey(item.productId, item.options);
          const lines = Array.from({ length: Math.max(1, qty) }, (_, n) => ({ ...item, key: `${base}#${Date.now().toString(36)}${n}${Math.random().toString(36).slice(2, 6)}`, qty: 1 }));
          return [...prev, ...lines];
        }),
      setQty: (key, qty) =>
        setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i)))),
      remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
    }),
    [items, service],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
