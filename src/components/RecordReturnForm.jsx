import { useState } from "react";
import supabase from "../supabase-client";
import { RETURN_REASONS } from "../returnReasons";
import { RETURN_WINDOW_DAYS } from "../config";

const DAY_MS = 24 * 60 * 60 * 1000;
const money = (n) => `${Number(n).toLocaleString()} EGP`;

function RecordReturnForm({ onRecorded }) {
  const [open, setOpen] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [order, setOrder] = useState(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState("wrong_size");
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const deliveredDays = order?.delivered_at
    ? Math.floor((Date.now() - new Date(order.delivered_at).getTime()) / DAY_MS)
    : null;
  const outsideWindow =
    deliveredDays !== null && deliveredDays > RETURN_WINDOW_DAYS;

  const refundPreview = order
    ? order.order_items
        .filter((i) => selected.includes(i.id))
        .reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0)
    : 0;

  const findOrder = async (e) => {
    e.preventDefault();
    const id = Number(orderIdInput);

    setOrder(null);
    setSelected([]);
    setError(null);
    setLookupError(null);

    if (!Number.isInteger(id) || id < 1) {
      setLookupError("Enter a valid order number.");
      return;
    }

    setLooking(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, status, delivered_at,
         user_profiles(name),
         order_items(id, quantity, unit_price,
           product_variants(size, color, products(name)),
           product_return_items(id))`,
      )
      .eq("id", id)
      .maybeSingle();
    setLooking(false);

    if (error) {
      console.error("Order lookup error:", error.message);
      setLookupError("Could not load the order.");
      return;
    }
    if (!data) {
      setLookupError("Order not found.");
      return;
    }
    setOrder(data);
  };

  const toggle = (itemId) => {
    setSelected((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.rpc("admin_record_return", {
      p_order_id: order.id,
      p_order_item_ids: selected,
      p_reason: reason,
      p_note: note.trim() || null,
      p_restock: restock,
    });

    if (error) {
      console.error("Record return error:", error.message);
      setError(error.message);
      setSubmitting(false);
      return;
    }

    setOrder(null);
    setOrderIdInput("");
    setSelected([]);
    setNote("");
    setReason("wrong_size");
    setRestock(true);
    setSubmitting(false);
    setOpen(false);
    await onRecorded();
  };

  if (!open) {
    return (
      <button
        className="primary-btn record-toggle"
        onClick={() => setOpen(true)}
      >
        + Record a return
      </button>
    );
  }

  return (
    <div className="record-box">
      <div className="admin-panel-head">
        <h3>Record a return</h3>
        <button className="ghost-btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <form className="lookup-row" onSubmit={findOrder}>
        <input
          type="number"
          min="1"
          placeholder="Order number"
          aria-label="Order number"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          required
        />
        <button type="submit" className="primary-btn" disabled={looking}>
          {looking ? "Searching..." : "Find order"}
        </button>
      </form>

      {lookupError && (
        <div role="alert" className="sign-form-error-message">
          {lookupError}
        </div>
      )}

      {order && order.status !== "delivered" && (
        <div className="warn-note">
          Order #{order.id} is "{order.status}". Only delivered orders can have
          a return.
        </div>
      )}

      {order && order.status === "delivered" && (
        <form className="record-form" onSubmit={handleSubmit}>
          <strong>
            Order #{order.id} ·{" "}
            {order.user_profiles?.name ?? "Unknown customer"}
          </strong>

          {outsideWindow && (
            <div className="warn-note">
              Delivered {deliveredDays} days ago, outside the{" "}
              {RETURN_WINDOW_DAYS}-day window.
            </div>
          )}

          {order.order_items.map((item) => {
            const v = item.product_variants;
            const returned = item.product_return_items.length > 0;
            return (
              <label key={item.id} className="check-row">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  disabled={returned || submitting}
                />
                {v?.products?.name} ({v?.size} / {v?.color}) × {item.quantity} ·{" "}
                {money(Number(item.unit_price) * item.quantity)}
                {returned && " — already returned"}
              </label>
            );
          })}

          <label className="field-label">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            >
              {Object.entries(RETURN_REASONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Note (optional)
            <textarea
              rows="2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              disabled={submitting}
            />
            Return items to stock
          </label>

          {error && (
            <div role="alert" className="sign-form-error-message">
              {error}
            </div>
          )}

          <div className="return-buttons">
            <strong>Refund: {money(refundPreview)}</strong>
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting || selected.length === 0}
            >
              {submitting ? "Saving..." : "Record return"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default RecordReturnForm;
