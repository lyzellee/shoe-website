import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RepresentativeDashboard.css";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
const STATUSES = ["pending", "processing", "shipped", "delivered"];
const ORDERS_PER_PAGE = 8;

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value || 0),
  );

const formatStatus = (status) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "Pending";

export default function RepresentativeDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [activeFilter, setActiveFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState("");
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const counts = useMemo(
    () =>
      STATUSES.reduce(
        (result, status) => ({
          ...result,
          [status]: orders.filter(
            (order) => order.orderStatus?.toLowerCase() === status,
          ).length,
        }),
        { all: orders.length },
      ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter(
      (order) => order.orderStatus?.toLowerCase() === activeFilter,
    );
  }, [orders, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const visibleOrders = filteredOrders.slice(
    (page - 1) * ORDERS_PER_PAGE,
    page * ORDERS_PER_PAGE,
  );

  useEffect(() => setPage(1), [activeFilter]);

  const getCustomerName = (order) =>
    order.customerInfo
      ? `${order.customerInfo.firstName || ""} ${order.customerInfo.lastName || ""}`.trim()
      : "Customer";

  const updateStatus = async (order, status) => {
    if (status === order.orderStatus?.toLowerCase()) return;
    const currentIndex = STATUSES.indexOf(order.orderStatus?.toLowerCase());
    const nextIndex = STATUSES.indexOf(status);
    if (nextIndex < currentIndex) return;

    setUpdatingId(order._id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ orderStatus: status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update status");
      await fetchOrders();
      setSelectedOrder((current) =>
        current?._id === order._id ? data.data : current,
      );
      setNotice(`Order ${order.orderReference || order._id} updated to ${formatStatus(status)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId("");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin/login", { replace: true });
  };

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const pendingOrders = orders.filter(
    (order) => order.orderStatus?.toLowerCase() === "pending",
  );

  const statusPercent = (status) =>
    orders.length ? Math.round((counts[status] / orders.length) * 100) : 0;

  const donutStyle = (() => {
    const pending = statusPercent("pending");
    const processing = pending + statusPercent("processing");
    const shipped = processing + statusPercent("shipped");
    const delivered = shipped + statusPercent("delivered");
    return {
      "--pending-stop": `${pending}%`,
      "--processing-stop": `${processing}%`,
      "--shipped-stop": `${shipped}%`,
      "--delivered-stop": `${delivered}%`,
    };
  })();

  return (
    <main className="representative-page">
      <aside className="representative-sidebar">
        <div className="representative-brand">SHOE WEBSITE</div>
        <nav className="representative-nav" aria-label="Representative navigation">
          <button
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activePage === "orders" ? "active" : ""}
            onClick={() => setActivePage("orders")}
          >
            Orders
          </button>
        </nav>
        <button className="representative-logout" onClick={logout}>Log out</button>
      </aside>

      <section className="representative-content">
        <header className="representative-header">
          <div>
            <p>ORDER MANAGEMENT</p>
            <h1>{activePage === "dashboard" ? "Dashboard" : "Product Orders"}</h1>
            {activePage === "dashboard" && (
              <span>Track order activity at a glance.</span>
            )}
            {activePage === "orders" && (
              <span>View and manage customer orders.</span>
            )}
          </div>
          {activePage === "dashboard" && <time>{dateLabel}</time>}
        </header>

        {notice && <div className="representative-notice">{notice}</div>}
        {error && <div className="representative-error">{error}</div>}

        {activePage === "dashboard" ? (
          <>
            <section className="representative-stats">
              <article className="representative-stat representative-stat-total">
                <span>Total Orders</span><strong>{orders.length}</strong><small>all time</small>
              </article>
              <article className="representative-stat">
                <span>Pending</span><strong>{counts.pending || 0}</strong><small>awaiting action</small>
              </article>
              <article className="representative-stat">
                <span>Processing</span><strong>{counts.processing || 0}</strong><small>being prepared</small>
              </article>
              <article className="representative-stat">
                <span>Shipped</span><strong>{counts.shipped || 0}</strong><small>on the way</small>
              </article>
              <article className="representative-stat">
                <span>Delivered</span><strong>{counts.delivered || 0}</strong><small>completed</small>
              </article>
            </section>

            <section className="representative-dashboard-grid">
              <article className="representative-card representative-status-card">
                <h2>Order Status</h2>
                <p>Share of all orders</p>
                <div className="representative-donut-wrap">
                  <div className="representative-donut" style={donutStyle}>
                    <div><strong>{orders.length}</strong><span>orders</span></div>
                  </div>
                </div>
                <div className="representative-legend">
                  {STATUSES.map((status) => (
                    <div key={status}>
                      <span className={`representative-dot ${status}`}></span>
                      <span className="representative-legend-label">{formatStatus(status)}</span>
                      <strong>{counts[status] || 0}</strong>
                      <small>{statusPercent(status)}%</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="representative-card representative-attention-card">
                <div className="representative-card-heading">
                  <div><h2>Needs Your Attention</h2><p>Pending orders waiting to be picked up.</p></div>
                  <button onClick={() => { setActiveFilter("pending"); setActivePage("orders"); }}>View all orders</button>
                </div>
                <div className="representative-attention-list">
                  {loading ? (
                    <div className="representative-attention-empty">Loading orders...</div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="representative-attention-empty">No pending orders need attention.</div>
                  ) : pendingOrders.slice(0, 4).map((order) => (
                    <div className="representative-attention-row" key={order._id}>
                      <div>
                        <strong>#{order.orderReference || order._id}</strong>
                        <span>{getCustomerName(order)} · {order.items?.length || 0} item(s) · {formatPrice(order.totalPrice)}</span>
                      </div>
                      <span className="representative-mini-status">Pending</span>
                      <button onClick={() => setSelectedOrder(order)}>Review order</button>
                    </div>
                  ))}
                  {pendingOrders.length > 4 && (
                    <button className="representative-more" onClick={() => { setActiveFilter("pending"); setActivePage("orders"); }}>
                      {pendingOrders.length - 4} more pending order{pendingOrders.length - 4 === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : (
          <section className="representative-orders-card">
            <div className="representative-orders-heading">
              <div><h2>All Orders</h2><p>Use the status menu to move an order forward.</p></div>
              <div className="representative-filter-pills">
                {[
                  ["all", orders.length, "All"],
                  ["pending", counts.pending || 0, "Pending"],
                  ["processing", counts.processing || 0, "Processing"],
                  ["shipped", counts.shipped || 0, "Shipped"],
                  ["delivered", counts.delivered || 0, "Delivered"],
                ].map(([value, count, label]) => (
                  <button
                    key={value}
                    className={activeFilter === value ? "active" : ""}
                    onClick={() => setActiveFilter(value)}
                  >
                    {label} {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="representative-table-wrap">
              <table className="representative-table">
                <thead><tr><th>Reference</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="representative-empty">Loading orders...</td></tr>
                  ) : visibleOrders.length === 0 ? (
                    <tr><td colSpan="6" className="representative-empty">No orders found.</td></tr>
                  ) : visibleOrders.map((order) => {
                    const currentIndex = STATUSES.indexOf(order.orderStatus?.toLowerCase());
                    return (
                      <tr key={order._id}>
                        <td><strong>#{order.orderReference || order._id}</strong></td>
                        <td>{getCustomerName(order)}</td>
                        <td>{order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0}</td>
                        <td><strong>{formatPrice(order.totalPrice)}</strong></td>
                        <td>
                          <select
                            className={`representative-status representative-status-${order.orderStatus?.toLowerCase()}`}
                            value={order.orderStatus?.toLowerCase() || "pending"}
                            disabled={updatingId === order._id || order.orderStatus === "cancelled"}
                            onChange={(event) => updateStatus(order, event.target.value)}
                          >
                            {STATUSES.map((status, index) => (
                              <option key={status} value={status} disabled={index < currentIndex}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td><button className="representative-view" onClick={() => setSelectedOrder(order)}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer className="representative-table-footer">
              <span>Showing {visibleOrders.length} of {filteredOrders.length} orders</span>
              <div>
                <button disabled={page === 1} onClick={() => setPage((current) => current - 1)}>‹</button>
                <span>Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>›</button>
              </div>
            </footer>
          </section>
        )}
      </section>

      {selectedOrder && (
        <div className="representative-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedOrder(null);
        }}>
          <div className="representative-modal" role="dialog" aria-modal="true">
            <button className="representative-modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            <p className="representative-modal-eyebrow">ORDER DETAILS</p>
            <h2>#{selectedOrder.orderReference || selectedOrder._id}</h2>
            <div className="representative-modal-grid">
              <div><span>Customer</span><strong>{getCustomerName(selectedOrder)}</strong></div>
              <div><span>Payment</span><strong>{formatStatus(selectedOrder.paymentStatus)}</strong></div>
              <div><span>Total</span><strong>{formatPrice(selectedOrder.totalPrice)}</strong></div>
              <div><span>Status</span><strong>{formatStatus(selectedOrder.orderStatus)}</strong></div>
            </div>
            <div className="representative-products">
              {selectedOrder.items?.map((item, index) => {
                const shoe = item.shoeId || {};
                return (
                  <div className="representative-product" key={item._id || index}>
                    <div><strong>{shoe.name || item.name || "Product"}</strong><span>Size {item.size || "—"} · {item.color || "—"} · Qty {item.quantity || 1}</span></div>
                    <strong>{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
