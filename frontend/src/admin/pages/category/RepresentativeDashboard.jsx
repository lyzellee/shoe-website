import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RepresentativeDashboard.css";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
const STATUSES = ["pending", "processing", "shipped", "delivered"];

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

export default function RepresentativeDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState("");

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
        {},
      ),
    [orders],
  );

  const updateStatus = async (order, status) => {
    if (status === order.orderStatus) return;
    const token = localStorage.getItem("token");
    setUpdatingId(order._id);
    setNotice("");
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderStatus: status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update status");
      await fetchOrders();
      setSelectedOrder((current) =>
        current?._id === order._id ? data.data : current,
      );
      setNotice(`Order ${order.orderReference || order._id} updated to ${status}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId("");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  const getCustomerName = (order) =>
    order.customerInfo
      ? `${order.customerInfo.firstName || ""} ${order.customerInfo.lastName || ""}`.trim()
      : "Customer";

  return (
    <main className="representative-page">
      <aside className="representative-sidebar">
        <div className="representative-brand">SHOE HUB</div>
        <nav>
          <button className="representative-nav-active">Orders</button>
        </nav>
        <button className="representative-logout" onClick={logout}>Log out</button>
      </aside>

      <section className="representative-content">
        <header className="representative-header">
          <div>
            <p>ORDER MANAGEMENT</p>
            <h1>Representative Dashboard</h1>
          </div>
          <button className="representative-refresh" onClick={fetchOrders}>Refresh</button>
        </header>

        <section className="representative-stats">
          <div><span>Total Orders</span><strong>{orders.length}</strong></div>
          <div><span>Pending</span><strong>{counts.pending || 0}</strong></div>
          <div><span>Processing</span><strong>{counts.processing || 0}</strong></div>
          <div><span>Shipped</span><strong>{counts.shipped || 0}</strong></div>
          <div><span>Delivered</span><strong>{counts.delivered || 0}</strong></div>
        </section>

        {notice && <div className="representative-notice">{notice}</div>}
        {error && <div className="representative-error">{error}</div>}

        <section className="representative-table-card">
          <div className="representative-table-heading">
            <div><h2>Customer Orders</h2><p>Update each order as it moves toward delivery.</p></div>
          </div>
          <div className="representative-table-wrap">
            <table className="representative-table">
              <thead><tr><th>Reference</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Details</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="representative-empty">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="6" className="representative-empty">No orders found.</td></tr>
                ) : orders.map((order) => {
                  const currentIndex = STATUSES.indexOf(order.orderStatus?.toLowerCase());
                  return (
                    <tr key={order._id}>
                      <td><strong>#{order.orderReference || order._id}</strong></td>
                      <td>{getCustomerName(order)}</td>
                      <td>{order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0}</td>
                      <td><strong>{formatPrice(order.totalPrice)}</strong></td>
                      <td>
                        <select
                          className={`representative-status representative-status-${order.orderStatus}`}
                          value={order.orderStatus || "pending"}
                          disabled={updatingId === order._id}
                          onChange={(event) => updateStatus(order, event.target.value)}
                        >
                          {STATUSES.map((status, index) => (
                            <option key={status} value={status} disabled={index < currentIndex}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
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
        </section>
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
              <div><span>Payment</span><strong>{selectedOrder.paymentStatus || "Pending"}</strong></div>
              <div><span>Total</span><strong>{formatPrice(selectedOrder.totalPrice)}</strong></div>
              <div><span>Status</span><strong>{selectedOrder.orderStatus || "Pending"}</strong></div>
            </div>
            <div className="representative-products">
              {selectedOrder.items?.map((item, index) => {
                const shoe = item.shoeId || {};
                return (
                  <div className="representative-product" key={item._id || index}>
                    <div>
                      <strong>{shoe.name || item.name || "Product"}</strong>
                      <span>Size {item.size || "—"} · {item.color || "—"} · Qty {item.quantity || 1}</span>
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
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
