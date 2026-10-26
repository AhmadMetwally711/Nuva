import { useCallback, useEffect, useState } from "react";
import supabase from "../supabase-client";
import { useSearchParams } from "react-router-dom";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];
const FINAL = ["delivered", "cancelled"];

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const filter = STATUSES.includes(rawStatus) ? rawStatus : "all";
  const setFilter = (s) => setSearchParams(s === "all" ? {} : { status: s });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, status, total, created_at, shipping_address, phone,
         user_profiles(name),
         order_items(id, quantity, unit_price,
           product_variants(size, color, products(name)))`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error.message);
      setError("Could not load orders. Please try again.");
    } else {
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (order, newStatus) => {
    if (
      newStatus === "cancelled" &&
      !window.confirm(`Cancel order #${order.id}? Stock will be returned.`)
    ) {
      return;
    }

    setUpdatingId(order.id);
    setActionError(null);

    const { error } = await supabase.rpc("admin_set_order_status", {
      p_order_id: order.id,
      p_status: newStatus,
    });

    if (error) {
      console.error("Status error:", error.message);
      setActionError(error.message);
    }

    await loadOrders();
    setUpdatingId(null);
  };

  if (loading) return <p>Loading...</p>;
  if (error) {
    return (
      <p role="alert" className="sign-form-error-message">
        {error}
      </p>
    );
  }

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const countOf = (s) => orders.filter((o) => o.status === s).length;

  return (
    <section aria-label="Manage orders">
      <div className="filter-bar" role="group" aria-label="Filter by status">
        <button
          className={`filter-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({orders.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`filter-chip ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s} ({countOf(s)})
          </button>
        ))}
      </div>

      {actionError && (
        <div role="alert" className="sign-form-error-message">
          {actionError}
        </div>
      )}

      {visible.length === 0 ? (
        <p>No orders here.</p>
      ) : (
        <ul className="orders-list">
          {visible.map((order) => (
            <li key={order.id} className="order-card">
              <div className="order-head">
                <div className="order-meta">
                  <strong>Order #{order.id}</strong>
                  <span className="cart-item-variant">
                    {formatDate(order.created_at)}
                  </span>
                </div>

                <select
                  value={order.status}
                  disabled={
                    updatingId === order.id || FINAL.includes(order.status)
                  }
                  onChange={(e) => handleStatusChange(order, e.target.value)}
                  aria-label={`Status of order ${order.id}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="customer-box">
                <strong>
                  {order.user_profiles?.name ?? "Unknown customer"}
                </strong>
                <a href={`tel:${order.phone}`}>{order.phone}</a>
                <span>{order.shipping_address}</span>
              </div>

              <ul className="order-items">
                {order.order_items.map((item) => {
                  const v = item.product_variants;
                  return (
                    <li key={item.id} className="order-line admin-line">
                      <div className="cart-item-info">
                        <span>{v?.products?.name}</span>
                        <span className="cart-item-variant">
                          {v?.size} / {v?.color} × {item.quantity}
                        </span>
                      </div>
                      <span>
                        {(
                          Number(item.unit_price) * item.quantity
                        ).toLocaleString()}{" "}
                        EGP
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="order-total">
                <span>Total</span>
                <strong>{Number(order.total).toLocaleString()} EGP</strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminOrders;
