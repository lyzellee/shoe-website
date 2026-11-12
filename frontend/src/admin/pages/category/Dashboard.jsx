import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

// Works whether VITE_API_BASE_URL is "http://localhost:5000" or "http://localhost:5000/api"
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");
const API_URL = `${API_ROOT}/api/dashboard-stats`;

const peso = (n = 0) =>
  `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

const pesoCompact = (n = 0) => {
  if (n >= 1_000_000) return `₱${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${+(n / 1_000).toFixed(1)}k`;
  return `₱${n}`;
};

const STATUS_COLORS = {
  pending: "#f2c230",
  processing: "#6b7280",
  shipped: "#8c9f7e",
  delivered: "#15803d",
  completed: "#15803d",
  cancelled: "#c2410c",
};

const statusKey = (s = "") => String(s).toLowerCase();
const statusColor = (s) => STATUS_COLORS[statusKey(s)] || "#a3a89d";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/* ---------- Small pieces ---------- */

function StatCard({ label, value, note, growth, accent }) {
  const hasGrowth = typeof growth === "number";
  const up = growth >= 0;
  return (
    <div className={`dash-card dash-stat ${accent ? "dash-stat--accent" : ""}`}>
      <span className="dash-stat-label">{label}</span>
      <strong className="dash-stat-value">{value}</strong>
      <div className="dash-stat-foot">
        {hasGrowth && (
          <span className={`dash-trend ${up ? "is-up" : "is-down"}`}>
            {up ? "▲" : "▼"} {Math.abs(growth)}%
          </span>
        )}
        <span className="dash-stat-note">{note}</span>
      </div>
    </div>
  );
}

function RevenueChart({ data }) {
  const [metric, setMetric] = useState("sales");
  const [active, setActive] = useState(null);

  const currentMonth = new Date().getMonth();
  const max = Math.max(...data.map((d) => d[metric]), 1);
  const niceMax = (() => {
    const pow = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / pow) * pow;
  })();
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(niceMax * t));
  const total = data.reduce((sum, d) => sum + d[metric], 0);

  const fmt = (v) => (metric === "sales" ? pesoCompact(v) : v);

  return (
    <section className="dash-card dash-chart">
      <div className="dash-card-head">
        <div>
          <h2>Sales Overview</h2>
          <p>
            {metric === "sales" ? peso(total) : `${total} orders`} so far this
            year
          </p>
        </div>
        <div className="dash-toggle" role="tablist">
          {["sales", "orders"].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={metric === m}
              className={metric === m ? "is-active" : ""}
              onClick={() => setMetric(m)}
            >
              {m === "sales" ? "Revenue" : "Orders"}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-bars">
        <div className="dash-bars-axis">
          {ticks.map((t) => (
            <span key={t}>{fmt(t)}</span>
          ))}
        </div>

        <div className="dash-bars-plot">
          <div className="dash-bars-grid">
            {ticks.map((t) => (
              <i key={t} />
            ))}
          </div>

          {data.map((d, i) => {
            const h = (d[metric] / niceMax) * 100;
            return (
              <div
                key={d.month}
                className={`dash-bar-col ${i === currentMonth ? "is-current" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={0}
              >
                {active === i && (
                  <div className="dash-tip">
                    <b>{d.month}</b>
                    <span>{peso(d.sales)}</span>
                    <span>{d.orders} orders</span>
                  </div>
                )}
                <div className="dash-bar-track">
                  <div
                    className="dash-bar"
                    style={{ height: `${Math.max(h, d[metric] ? 2 : 0)}%` }}
                  />
                </div>
                <span className="dash-bar-month">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatusDonut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <section className="dash-card dash-donut-card">
      <div className="dash-card-head">
        <div>
          <h2>Order Status</h2>
          <p>Share of all orders</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="dash-empty">No orders yet.</div>
      ) : (
        <>
          <div className="dash-donut">
            <svg viewBox="0 0 140 140" role="img" aria-label="Order status">
              <circle cx="70" cy="70" r={R} className="dash-donut-bg" />
              {data.map((d) => {
                const len = (d.count / total) * C;
                const el = (
                  <circle
                    key={d._id}
                    cx="70"
                    cy="70"
                    r={R}
                    className="dash-donut-seg"
                    stroke={statusColor(d._id)}
                    strokeDasharray={`${Math.max(len - 2, 0)} ${C - len + 2}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <div className="dash-donut-center">
              <strong>{total}</strong>
              <span>orders</span>
            </div>
          </div>

          <ul className="dash-legend">
            {data.map((d) => (
              <li key={d._id}>
                <i style={{ background: statusColor(d._id) }} />
                <span>{d._id}</span>
                <b>{d.count}</b>
                <em>{Math.round((d.count / total) * 100)}%</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TopShoes({ data }) {
  const max = Math.max(...data.map((s) => s.totalQuantitySold), 1);
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <div>
          <h2>Best Sellers</h2>
          <p>Top 5 shoes by pairs sold</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="dash-empty">No sales recorded yet.</div>
      ) : (
        <ol className="dash-rank">
          {data.map((s, i) => (
            <li key={s._id}>
              <span className="dash-rank-pos">{i + 1}</span>
              <div className="dash-rank-body">
                <div className="dash-rank-top">
                  <div>
                    <strong>{s.name}</strong>
                    {s.brand && <small>{s.brand}</small>}
                  </div>
                  <div className="dash-rank-nums">
                    <b>{s.totalQuantitySold} pairs</b>
                    <small>{peso(s.totalRevenueGenerated)}</small>
                  </div>
                </div>
                <div className="dash-rank-track">
                  <div
                    style={{ width: `${(s.totalQuantitySold / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RecentOrders({ data }) {
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <div>
          <h2>Recent Orders</h2>
          <p>Latest 5 customer orders</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="dash-empty">No orders yet.</div>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Date</th>
                <th className="t-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o._id || o.orderNumber}>
                  <td className="t-strong">{o.orderNumber}</td>
                  <td>{o.customerName || "—"}</td>
                  <td>
                    <span className={`dash-pill is-${statusKey(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="t-muted">{formatDate(o.createdAt)}</td>
                  <td className="t-right t-strong">{peso(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="dash-skeleton" aria-busy="true" aria-label="Loading">
      <div className="dash-grid-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dash-card sk-block sk-stat" />
        ))}
      </div>
      <div className="dash-grid-main">
        <div className="dash-card sk-block sk-tall" />
        <div className="dash-card sk-block sk-tall" />
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const { data } = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't load the dashboard. Check that the server is running.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const avgOrder = useMemo(() => {
    if (!stats?.summary?.paidOrders) return 0;
    return stats.summary.totalRevenue / stats.summary.paidOrders;
  }, [stats]);

  const year = new Date().getFullYear();
  const monthName = new Date().toLocaleString("en-PH", { month: "long" });

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <span className="dash-eyebrow">Administration</span>
          <h1>Dashboard</h1>
          <p>Track sales, best sellers, and order activity at a glance.</p>
        </div>
        <div className="dash-header-actions">
          <span className="dash-chip">{year}</span>
        </div>
      </header>

      {loading && !stats && <Skeleton />}

      {error && (
        <div className="dash-card dash-error">
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
          <button className="dash-btn" onClick={fetchStats}>
            Try again
          </button>
        </div>
      )}

      {stats && !error && (
        <>
          <div className="dash-grid-4">
            <StatCard
              accent
              label="Total Revenue"
              value={peso(stats.summary.totalRevenue)}
              note="from paid orders"
            />
            <StatCard
              label={`${monthName} Revenue`}
              value={peso(stats.summary.monthlyRevenue)}
              growth={stats.summary.monthlyGrowth}
              note="vs last month"
            />
            <StatCard
              label="Total Orders"
              value={stats.summary.totalOrders.toLocaleString()}
              note="all time"
            />
            <StatCard
              label="Average Order"
              value={peso(avgOrder)}
              note="per order"
            />
          </div>

          <div className="dash-grid-main">
            <RevenueChart data={stats.analytics.monthlySalesTrend} />
            <StatusDonut data={stats.analytics.statusBreakdown} />
          </div>

          <div className="dash-grid-bottom">
            <TopShoes data={stats.analytics.topShoes} />
            <RecentOrders data={stats.recentOrders} />
          </div>
        </>
      )}
    </div>
  );
}
