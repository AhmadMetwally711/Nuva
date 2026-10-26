import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <section aria-label="Shopping cart" className="cart-section">
        <h1 className="shop-title">Your cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/shop" className="back-link">
          Continue shopping →
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Shopping cart" className="cart-section">
      <h1 className="shop-title">Your cart</h1>

      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.variantId} className="cart-item">
              <img src={item.image_url} alt={item.name} />

              <div className="cart-item-info">
                <Link to={`/product/${item.productId}`}>{item.name}</Link>
                <span className="cart-item-variant">
                  {item.size} / {item.color}
                </span>
                <span className="product-price">
                  {item.price.toLocaleString()} EGP
                </span>
              </div>

              <div className="qty-control">
                <button
                  aria-label="Decrease quantity"
                  onClick={() =>
                    updateQuantity(item.variantId, item.quantity - 1)
                  }
                >
                  −
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={item.quantity >= item.stock}
                  onClick={() =>
                    updateQuantity(item.variantId, item.quantity + 1)
                  }
                >
                  +
                </button>
              </div>

              <button
                className="remove-btn"
                onClick={() => removeItem(item.variantId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Order summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{subtotal.toLocaleString()} EGP</strong>
          </div>
          <Link to="/checkout" className="add-to-cart-btn checkout-link">
            Checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
