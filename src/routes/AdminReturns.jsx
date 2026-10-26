import { useEffect, useState } from "react";
import supabase from "../supabase-client";
import RecordReturnForm from "../components/RecordReturnForm";
import { RETURN_REASONS } from "../returnReasons";

const money = (n) => `${Number(n).toLocaleString()} EGP`;

const formatDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });

function cairoToday() {
  const [year, month] = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" })
    .split("-")
    .map(Number);
  return { year, month };
}

function AdminReturns() {
  const [period, setPeriod] = useState(cairoToday);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_returns_month", {
        p_year: period.year,
        p_month: period.month,
      });
      if (cancelled) return;

      if (error) {
        console.error("Error loading returns:", error.message);
        setError("Could not load returns. Please try again.");
      } else {
        setError(null);
        setData(data);
      }
      setLoading(false);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [period, reloadKey]);

  const shiftMonth = (delta) => {
    setPeriod(({ year, month }) => {
      const d = new Date(Date.UTC(year, month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
  };

  const handleRecorded = async () => {
    setPeriod(cairoToday());
    setReloadKey((k) => k + 1);
  };

  const today = cairoToday();
  const isCurrentMonth =
    period.year === today.year && period.month === today.month;

  const monthLabel = new Date(
    Date.UTC(period.year, period.month - 1, 1),
  ).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section aria-label="Returns">
      <div className="month-nav">
        <button
          className="ghost-btn"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <h2>{monthLabel}</h2>
        <button
          className="ghost-btn"
          onClick={() => shiftMonth(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <RecordReturnForm onRecorded={handleRecorded} />

      {error && (
        <p role="alert" className="sign-form-error-message">
          {error}
        </p>
      )}

      {loading && !data && <p>Loading...</p>}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Returns</span>
              <strong className="stat-value">{data.count}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Refunded</span>
              <strong className="stat-value">{money(data.refunded)}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Most common reason</span>
              <strong className="stat-value">
                {data.top_reason ? RETURN_REASONS[data.top_reason] : "—"}
              </strong>
            </div>
          </div>

          {data.returns.length === 0 ? (
            <p>No returns in {monthLabel}.</p>
          ) : (
            <ul className="orders-list">
              {data.returns.map((r) => (
                <li key={r.id} className="order-card">
                  <div className="order-head">
                    <div className="order-meta">
                      <strong>
                        Return #{r.id} · Order #{r.order_id}
                      </strong>
                      <span className="cart-item-variant">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <span className="status-badge return-reason-badge">
                      {RETURN_REASONS[r.reason]}
                    </span>
                  </div>

                  <div className="customer-box">
                    <strong>{r.customer ?? "Unknown customer"}</strong>
                    <a href={`tel:${r.phone}`}>{r.phone}</a>
                  </div>

                  {r.note && (
                    <p className="return-note">
                      <strong>Note:</strong> {r.note}
                    </p>
                  )}

                  <ul className="order-items">
                    {r.items.map((it) => (
                      <li key={it.id} className="order-line admin-line">
                        <div className="cart-item-info">
                          <span>{it.name}</span>
                          <span className="cart-item-variant">
                            {it.size} / {it.color} × {it.quantity}
                          </span>
                        </div>
                        <span>
                          {money(Number(it.unit_price) * it.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="order-total">
                    <span>
                      Refunded ·{" "}
                      {r.restocked ? "back in stock" : "not restocked"}
                    </span>
                    <strong>{money(r.refund_amount)}</strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default AdminReturns;
