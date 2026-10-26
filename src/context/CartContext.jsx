import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

const keyFor = (owner) => `nuva-cart:${owner}`;

function readCart(owner) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(owner)));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeCart(owner, items) {
  try {
    localStorage.setItem(keyFor(owner), JSON.stringify(items));
  } catch (error) {
    console.error("Could not save cart:", error.message);
  }
}

function mergeCarts(base, extra) {
  const merged = base.map((i) => ({ ...i }));
  for (const item of extra) {
    const existing = merged.find((i) => i.variantId === item.variantId);
    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + item.quantity,
        existing.stock,
      );
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

export const CartProvider = ({ children }) => {
  const { session } = useAuth();

  const owner = session === undefined ? null : (session?.user?.id ?? "guest");

  const [cart, setCart] = useState({ owner: null, items: [] });

  useEffect(() => {
    if (owner === null) return;

    let items = readCart(owner);

    if (owner !== "guest") {
      const guestItems = readCart("guest");
      if (guestItems.length > 0) {
        items = mergeCarts(items, guestItems);
        writeCart(owner, items);
        writeCart("guest", []);
      }
    }

    setCart({ owner, items });
  }, [owner]);

  useEffect(() => {
    if (cart.owner === null) return;
    writeCart(cart.owner, cart.items);
  }, [cart]);

  const items = cart.owner === owner ? cart.items : [];

  const update = (fn) =>
    setCart((prev) =>
      owner !== null && prev.owner === owner
        ? { ...prev, items: fn(prev.items) }
        : prev,
    );

  const addItem = (newItem) =>
    update((list) => {
      const existing = list.find((i) => i.variantId === newItem.variantId);
      if (existing) {
        return list.map((i) =>
          i.variantId === newItem.variantId
            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
            : i,
        );
      }
      return [...list, { ...newItem, quantity: 1 }];
    });

  const removeItem = (variantId) =>
    update((list) => list.filter((i) => i.variantId !== variantId));

  const updateQuantity = (variantId, quantity) => {
    if (quantity < 1) {
      removeItem(variantId);
      return;
    }
    update((list) =>
      list.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i,
      ),
    );
  };

  const clearCart = () => update(() => []);

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
