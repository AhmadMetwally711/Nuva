import { createContext, useContext, useEffect, useRef, useState } from "react";
import supabase from "../supabase-client";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

const MAX_QTY = 99;
const keyFor = (owner) => `nuva-cart:${owner}`;

function readLocal(owner) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(owner)));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeLocal(owner, items) {
  try {
    localStorage.setItem(keyFor(owner), JSON.stringify(items));
  } catch (error) {
    console.error("Could not save cart:", error.message);
  }
}

function removeLocal(owner) {
  try {
    localStorage.removeItem(keyFor(owner));
  } catch {
    /* ignore */
  }
}

function toItem(row) {
  const variant = row.product_variants;
  const product = variant?.products;
  if (!variant || !product || !product.is_active || variant.stock < 1) {
    return null;
  }
  return {
    variantId: variant.id,
    productId: product.id,
    name: product.name,
    price: Number(product.price),
    image_url: product.image_url,
    size: variant.size,
    color: variant.color,
    stock: variant.stock,
    quantity: Math.min(row.quantity, variant.stock),
  };
}

async function fetchServerCart(userId) {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `variant_id, quantity,
       product_variants(id, size, color, stock,
         products(id, name, price, image_url, is_active))`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data.map(toItem).filter(Boolean);
}

async function mergeIntoServer(userId, items) {
  const wanted = new Map();
  for (const item of items) {
    wanted.set(
      item.variantId,
      (wanted.get(item.variantId) ?? 0) + item.quantity,
    );
  }
  if (wanted.size === 0) return;

  const { data: existing, error: readError } = await supabase
    .from("cart_items")
    .select("variant_id, quantity")
    .eq("user_id", userId);
  if (readError) throw readError;

  const current = new Map(existing.map((r) => [r.variant_id, r.quantity]));
  const rows = [...wanted].map(([variantId, quantity]) => ({
    user_id: userId,
    variant_id: variantId,
    quantity: Math.min((current.get(variantId) ?? 0) + quantity, MAX_QTY),
  }));

  const { error } = await supabase
    .from("cart_items")
    .upsert(rows, { onConflict: "user_id,variant_id" });
  if (error) throw error;
}

const inflight = new Map();

function loadOwnerCart(owner) {
  if (!inflight.has(owner)) {
    const promise = (async () => {
      if (owner === "guest") return readLocal("guest");

      const localItems = [...readLocal("guest"), ...readLocal(owner)];
      if (localItems.length > 0) {
        await mergeIntoServer(owner, localItems);
        writeLocal("guest", []);
        removeLocal(owner);
      }
      return fetchServerCart(owner);
    })().finally(() => inflight.delete(owner));

    inflight.set(owner, promise);
  }
  return inflight.get(owner);
}

export const CartProvider = ({ children }) => {
  const { session } = useAuth();

  const owner = session === undefined ? null : (session?.user?.id ?? "guest");

  const [cart, setCart] = useState({ owner: null, items: [] });
  const pending = useRef(0);

  useEffect(() => {
    if (owner === null) return;
    let cancelled = false;

    loadOwnerCart(owner)
      .then((items) => {
        if (!cancelled) setCart({ owner, items });
      })
      .catch((error) => {
        console.error("Could not load cart:", error.message);
        if (!cancelled) setCart({ owner, items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [owner]);

  useEffect(() => {
    if (cart.owner === "guest") writeLocal("guest", cart.items);
  }, [cart]);

  useEffect(() => {
    if (owner === null || owner === "guest") return;

    const refreshOnFocus = () => {
      if (document.visibilityState !== "visible" || pending.current > 0) return;
      fetchServerCart(owner)
        .then((items) =>
          setCart((prev) =>
            prev.owner === owner && pending.current === 0
              ? { ...prev, items }
              : prev,
          ),
        )
        .catch((error) =>
          console.error("Could not refresh cart:", error.message),
        );
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () =>
      document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [owner]);

  const ready = owner !== null && cart.owner === owner;
  const items = ready ? cart.items : [];

  const setItems = (next) =>
    setCart((prev) => (prev.owner === owner ? { ...prev, items: next } : prev));

  const sync = async (operation) => {
    if (owner === "guest") return;
    pending.current += 1;
    try {
      const { error } = await operation();
      if (error) throw error;
    } catch (error) {
      console.error("Cart sync failed:", error.message);
      try {
        const fresh = await fetchServerCart(owner);
        setCart((prev) =>
          prev.owner === owner ? { ...prev, items: fresh } : prev,
        );
      } catch (refreshError) {
        console.error("Could not restore cart:", refreshError.message);
      }
    } finally {
      pending.current -= 1;
    }
  };

  const saveQuantity = (variantId, quantity) =>
    sync(() =>
      supabase
        .from("cart_items")
        .upsert(
          { user_id: owner, variant_id: variantId, quantity },
          { onConflict: "user_id,variant_id" },
        ),
    );

  const addItem = (newItem) => {
    if (!ready) return;
    const existing = items.find((i) => i.variantId === newItem.variantId);
    const quantity = existing
      ? Math.min(existing.quantity + 1, existing.stock, MAX_QTY)
      : 1;

    setItems(
      existing
        ? items.map((i) =>
            i.variantId === newItem.variantId ? { ...i, quantity } : i,
          )
        : [...items, { ...newItem, quantity }],
    );
    saveQuantity(newItem.variantId, quantity);
  };

  const removeItem = (variantId) => {
    if (!ready) return;
    setItems(items.filter((i) => i.variantId !== variantId));
    sync(() =>
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", owner)
        .eq("variant_id", variantId),
    );
  };

  const updateQuantity = (variantId, quantity) => {
    if (!ready) return;
    if (quantity < 1) {
      removeItem(variantId);
      return;
    }
    const target = items.find((i) => i.variantId === variantId);
    if (!target) return;

    const next = Math.min(quantity, target.stock, MAX_QTY);
    setItems(
      items.map((i) =>
        i.variantId === variantId ? { ...i, quantity: next } : i,
      ),
    );
    saveQuantity(variantId, next);
  };

  const clearCart = () => {
    if (!ready) return;
    setItems([]);
    sync(() => supabase.from("cart_items").delete().eq("user_id", owner));
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
