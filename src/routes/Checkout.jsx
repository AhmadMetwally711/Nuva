import { useActionState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabase-client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [state, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const address = formData.get("address")?.toString().trim();
      const phone = formData.get("phone")?.toString().trim();

      const { data: orderId, error } = await supabase.rpc("create_order", {
        p_items: items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        p_address: address,
        p_phone: phone,
      });

      if (error) {
        console.error("Order error:", error.message);
        return { error: error.message, values: { address, phone } };
      }

      clearCart();
      navigate(`/order-success/${orderId}`);
      return { error: null, values: {} };
    },
    { error: null, values: {} },
  );

  if (isAdmin) {
    return (
      <>
        <h1 className="shop-title">Checkout</h1>
        <p>Admin accounts can't place orders. Please use a customer account.</p>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <h1 className="shop-title">Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/shop" className="back-link">
          Continue shopping →
        </Link>
      </>
    );
  }

  return (
    <section aria-label="Checkout" className="checkout-section">
      <h1 className="shop-title">Checkout</h1>

      <div className="cart-layout">
        <form
          action={submitAction}
          className="checkout-form"
          aria-label="Shipping details"
        >
          <h2>Shipping details</h2>

          <label htmlFor="address">
            Address
            <textarea
              id="address"
              name="address"
              rows="3"
              required
              defaultValue={state.values.address ?? ""}
              disabled={isPending}
            />
          </label>

          <label htmlFor="phone">
            Phone
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              pattern="01[0125][0-9]{8}"
              title="Egyptian mobile number, e.g. 01012345678"
              defaultValue={state.values.phone ?? ""}
              disabled={isPending}
            />
          </label>

          <p className="payment-note">Payment: Cash on delivery</p>

          <button
            type="submit"
            className="add-to-cart-btn"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Placing order..." : "Place order"}
          </button>

          {state.error && (
            <div role="alert" className="sign-form-error-message">
              {state.error}
            </div>
          )}
        </form>

        <aside className="cart-summary">
          <h2>Order summary</h2>
          {items.map((i) => (
            <div key={i.variantId} className="summary-row summary-item">
              <span>
                {i.name} ({i.size}/{i.color}) × {i.quantity}
              </span>
              <span>{(i.price * i.quantity).toLocaleString()} EGP</span>
            </div>
          ))}
          <div className="summary-row summary-total">
            <span>Total</span>
            <strong>{subtotal.toLocaleString()} EGP</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Checkout;
