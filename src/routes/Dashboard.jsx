import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Chart } from "react-charts";
import supabase from "../supabase-client";

const RANGES = [7, 14, 30];

const money = (n) => `${Number(n).toLocaleString()} EGP`;

const shortDate = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

function Dashboard() {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_sales_stats", {
      p_days: days,
    });
    if (error) {
      console.error("Error loading stats:", error.message);
      setError("Could not load stats. Please try again.");
      return;
    }
    setError(null);
    setStats(data);
  }, [days]);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats]);

  const chartData = useMemo(
    () => [
      {
        label: "Revenue",
        data: (stats?.daily ?? []).map((d) => ({
          primary: shortDate(d.day),
          secondary: Number(d.revenue),
        })),
      },
    ],
    [stats],
  );

  const primaryAxis = useMemo(
    () => ({
      getValue: (d) => d.primary,
      scaleType: "band",
      padding: 0.2,
      position: "bottom",
    }),
    [],
  );

  const secondaryAxes = useMemo(
    () => [{ getValue: (d) => d.secondary, scaleType: "linear", min: 0 }],
    [],
  );

  if (error) {
    return (
      <p role="alert" className="sign-form-error-message">
        {error}
      </p>
    );
  }
  if (!stats) return <p>Loading...</p>;

  const periodRevenue = stats.daily.reduce(
    (sum, d) => sum + Number(d.revenue),
    0,
  );

  return (
    <section aria-label="Sales overview">
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Net revenue (delivered − refunds)</span>
          <strong className="stat-value">
            {money(Number(stats.revenue) - Number(stats.refunded))}
          </strong>
        </div>
        <Link to="/admin/returns" className="stat-card stat-link">
          <span className="stat-label">Refunded</span>
          <strong className="stat-value">{money(stats.refunded)}</strong>
        </Link>
        <div className="stat-card">
          <span className="stat-label">Delivered, last {days} days</span>
          <strong className="stat-value">{money(periodRevenue)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Expected (in progress)</span>
          <strong className="stat-value">{money(stats.expected)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Orders</span>
          <strong className="stat-value">{stats.orders_count}</strong>
        </div>
        <Link to="/admin/orders?status=pending" className="stat-card stat-link">
          <span className="stat-label">Pending orders</span>
          <strong className="stat-value">{stats.pending_count}</strong>
        </Link>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Delivered Revenue</h2>
          <div className="option-chips" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r}
                className={`filter-chip ${days === r ? "active" : ""}`}
                onClick={() => setDays(r)}
              >
                {r} days
              </button>
            ))}
          </div>
        </div>
        <div className="admin-chart">
          <Chart
            options={{
              data: chartData,
              primaryAxis,
              secondaryAxes,
              type: "bar",
              defaultColors: ["#3988C9"],
            }}
          />
        </div>
      </div>

      <div className="admin-panel">
        <h2>Most ordered</h2>
        {stats.top_products.length === 0 ? (
          <p>No sales yet.</p>
        ) : (
          <ol className="top-list">
            {stats.top_products.map((p) => (
              <li key={p.name}>
                <span>{p.name}</span>
                <strong>{p.units} sold</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
