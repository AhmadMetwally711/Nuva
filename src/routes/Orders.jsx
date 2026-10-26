import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../supabase-client";
import { useAuth } from "../context/AuthContext";
import ReturnPolicyNote from "../components/ReturnPolicyNote";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Orders() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, status, total, created_at, delivered_at,
         order_items(id, quantity, unit_price,
           product_variants(size, color,
             products(id, name, image_url)))`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error.message);
      setError("Could not load your orders. Please try again.");
    } else {
      setOrders(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadOrders();
  }, [userId, loadOrders]);

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    setCancelError(null);

    const { error } = await supabase.rpc("cancel_order", {
      p_order_id: orderId,
    });

    if (error) {
      console.error("Cancel error:", error.message);
      setCancelError(error.message);
    }

    await loadOrders();
    setCancellingId(null);
    setConfirmingId(null);
  };

  if (loading) return <p>Loading...</p>;

  if (error) {
    return (
      <p role="alert" className="sign-form-error-message">
        {error}
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        <h1 className="shop-title">My orders</h1>
        <p>You haven't placed any orders yet.</p>
        <Link to="/shop" className="back-link">
          Start shopping →
        </Link>
      </>
    );
  }

  const countOf = (...statuses) =>
    orders.filter((o) => statuses.includes(o.status)).length;

  const totalValue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <section aria-label="My orders" className="orders-page">
      <h1 className="shop-title">My orders</h1>

      {cancelError && (
        <div role="alert" className="sign-form-error-message">
          {cancelError}
        </div>
      )}

      <div className="cart-layout">
        <div>
          {orders.map((order) => (
            <article key={order.id} className="order-group">
              <div className="order-group-head">
                <div className="order-meta">
                  <span className="cart-item-variant">
                    {formatDate(order.created_at)}
                  </span>
                </div>
                <span className={`status-badge status-${order.status}`}>
                  {order.status}
                </span>
              </div>

              <ul className="cart-list">
                {order.order_items.map((item) => {
                  const variant = item.product_variants;
                  const product = variant?.products;
                  return (
                    <li key={item.id} className="cart-item">
                      <img src={product?.image_url} alt={product?.name ?? ""} />

                      <div className="cart-item-info">
                        {product?.id ? (
                          <Link to={`/product/${product.id}`}>
                            {product.name}
                          </Link>
                        ) : (
                          <span>{product?.name}</span>
                        )}
                        <span className="cart-item-variant">
                          {variant?.size} / {variant?.color}
                        </span>
                        <span className="product-price">
                          {Number(item.unit_price).toLocaleString()} EGP
                        </span>
                      </div>

                      <span className="order-item-qty">× {item.quantity}</span>

                      <strong className="order-item-total">
                        {(
                          Number(item.unit_price) * item.quantity
                        ).toLocaleString()}{" "}
                        EGP
                      </strong>
                    </li>
                  );
                })}
              </ul>

              <div className="order-group-foot">
                <span>Total</span>
                <strong>{Number(order.total).toLocaleString()} EGP</strong>
              </div>

              {order.status === "pending" && (
                <div className="order-actions">
                  {confirmingId === order.id ? (
                    <>
                      <span>Cancel this order?</span>
                      <button
                        className="danger-btn"
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingId === order.id}
                      >
                        {cancellingId === order.id
                          ? "Cancelling..."
                          : "Yes, cancel"}
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => setConfirmingId(null)}
                        disabled={cancellingId === order.id}
                      >
                        Keep order
                      </button>
                    </>
                  ) : (
                    <button
                      className="ghost-btn"
                      onClick={() => setConfirmingId(order.id)}
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              )}

              {order.status === "delivered" && (
                <ReturnPolicyNote deliveredAt={order.delivered_at} />
              )}
            </article>
          ))}
        </div>

        <aside className="cart-summary">
          <h2>Orders summary</h2>
          <div className="summary-row summary-item">
            <span>Orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="summary-row summary-item">
            <span>In progress</span>
            <strong>{countOf("pending", "paid", "shipped")}</strong>
          </div>
          <div className="summary-row summary-item">
            <span>Delivered</span>
            <strong>{countOf("delivered")}</strong>
          </div>
          <div className="summary-row summary-item">
            <span>Cancelled</span>
            <strong>{countOf("cancelled")}</strong>
          </div>
          <div className="summary-row summary-total">
            <span>Total (excl. cancelled)</span>
            <strong>{totalValue.toLocaleString()} EGP</strong>
          </div>
          <Link to="/shop" className="add-to-cart-btn checkout-link">
            Continue shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default Orders;
