import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
// Keep this import first so the child components' CSS can override it
import "./RepresentativeDashboard.css";
import RepresentativeNavbar from "../../components/RepresentativeNavbar";
import RepresentativeProductOrders from "./RepresentativeProductOrders";
import {
  DAY,
  RETURN_LABELS,
  STATUSES,
  formatDate,
  formatPrice,
  formatStatus,
  formatTime,
  getCustomerName,
  getItemCount,
  getOrderTime,
  getProductName,
} from "./RepresentativeUtils";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);

const QUEUE_TABS = [
  { key: "pending", label: "Pending" },
  { key: "processing", label: "To ship" },
  { key: "returns", label: "Returns" },
];

const QUEUE_EMPTY = {
  pending: "All caught up. No pending orders.",
  processing: "No orders are waiting to be shipped.",
  returns: "No return requests to review.",
};

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "C";

// How long an order has been sitting in its current step
const getSinceTime = (order, tab) => {
  if (tab === "returns") {
    return (
      new Date(order.returnRequestedAt || 0).getTime() || getOrderTime(order)
    );
  }
  const status = order.orderStatus?.toLowerCase();
  const entry = [...(order.statusHistory || [])]
    .reverse()
    .find((item) => item.status === status);
  const changed = entry?.changedAt ? new Date(entry.changedAt).getTime() : 0;
  return changed || getOrderTime(order);
};

const getQueueAge = (order, tab) => {
  const since = getSinceTime(order, tab);
  if (!since) return { label: "", level: "low" };
  const days = Math.floor((Date.now() - since) / DAY);
  const plural = `${days} day${days === 1 ? "" : "s"}`;
  let label;
  if (tab === "pending") label = days < 1 ? "New today" : `Waiting ${plural}`;
  else if (tab === "processing")
    label = days < 1 ? "Processing since today" : `Processing ${plural}`;
  else label = days < 1 ? "Requested today" : `Requested ${plural} ago`;
  return { label, level: days >= 3 ? "high" : days >= 1 ? "mid" : "low" };
};

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
  const [shipOrder, setShipOrder] = useState(null);
  const [shipForm, setShipForm] = useState({
    courier: "",
    trackingNumber: "",
    estimatedDelivery: "",
  });
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [queueTab, setQueueTab] = useState("pending");
  const hasLoadedRef = useRef(false);

  const fetchOrders = async () => {
    // Only show the loading state the first time, so the table doesn't flash after updates
    if (!hasLoadedRef.current) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to load orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Esc closes the shipping / order-details modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (shipOrder) setShipOrder(null);
      else if (selectedOrder) setSelectedOrder(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shipOrder, selectedOrder]);

  const counts = useMemo(
    () =>
      STATUSES.reduce(
        (result, status) => ({
          ...result,
          [status]: orders.filter(
            (order) => order.orderStatus?.toLowerCase() === status,
          ).length,
        }),
        {
          all: orders.length,
          cancelled: orders.filter(
            (order) => order.orderStatus?.toLowerCase() === "cancelled",
          ).length,
          returns: orders.filter((order) => Boolean(order.returnStatus)).length,
        },
      ),
    [orders],
  );

  const updateStatus = async (order, status, extra = {}) => {
    if (status === order.orderStatus?.toLowerCase()) return;
    const currentIndex = STATUSES.indexOf(order.orderStatus?.toLowerCase());
    const nextIndex = STATUSES.indexOf(status);
    if (nextIndex < currentIndex) return;

    setUpdatingId(order._id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(
        `${BASE_URL}/api/orders/${order._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ orderStatus: status, ...extra }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to update status");
      await fetchOrders();
      setSelectedOrder((current) =>
        current?._id === order._id
          ? {
              ...current,
              ...data.data,
              items: current.items,
              customerInfo: current.customerInfo,
            }
          : current,
      );
      setNotice(
        `Order ${order.orderReference || order._id} updated to ${formatStatus(status)}.`,
      );
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setUpdatingId("");
    }
  };

  // Status dropdown: Shipped asks for courier + tracking first
  const handleStatusChange = (order, status) => {
    if (status === "shipped") {
      setError("");
      setShipForm({
        courier: order.courier || "",
        trackingNumber: order.trackingNumber || "",
        estimatedDelivery: order.estimatedDelivery
          ? String(order.estimatedDelivery).slice(0, 10)
          : "",
      });
      setShipOrder(order);
      return;
    }
    if (
      status === "delivered" &&
      !window.confirm("Mark this order as delivered? This can't be undone.")
    ) {
      return;
    }
    updateStatus(order, status);
  };

  const submitShipForm = async (event) => {
    event.preventDefault();
    const courier = shipForm.courier.trim();
    const trackingNumber = shipForm.trackingNumber.trim();
    if (!courier || !trackingNumber) {
      setError("Courier and tracking number are required.");
      return;
    }
    const ok = await updateStatus(shipOrder, "shipped", {
      courier,
      trackingNumber,
      ...(shipForm.estimatedDelivery
        ? { estimatedDelivery: shipForm.estimatedDelivery }
        : {}),
    });
    if (ok) setShipOrder(null);
  };

  // Cancel a pending, unpaid order (stock is restored by the server)
  const cancelOrder = async (order) => {
    setUpdatingId(order._id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${order._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to cancel order");
      await fetchOrders();
      setSelectedOrder(null);
      setConfirmCancelId("");
      setNotice(
        `Order ${order.orderReference || order._id} was cancelled and its stock restored.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId("");
    }
  };

  // Approve / reject / refund a customer's return request
  const resolveReturn = async (order, decision) => {
    setUpdatingId(order._id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(
        `${BASE_URL}/api/orders/${order._id}/return`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ decision, note: returnNote }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to update the return");
      await fetchOrders();
      setSelectedOrder((current) =>
        current?._id === order._id
          ? {
              ...current,
              ...data.data,
              items: current.items,
              customerInfo: current.customerInfo,
            }
          : current,
      );
      setReturnNote("");
      setNotice(
        `Return for order ${order.orderReference || order._id} marked as ${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "refunded"}.`,
      );
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

  // Action queues, oldest first so the longest-waiting order is on top
  const queues = useMemo(() => {
    const oldestFirst = (tab) => (a, b) =>
      getSinceTime(a, tab) - getSinceTime(b, tab);
    return {
      pending: orders
        .filter((order) => order.orderStatus?.toLowerCase() === "pending")
        .sort(oldestFirst("pending")),
      processing: orders
        .filter((order) => order.orderStatus?.toLowerCase() === "processing")
        .sort(oldestFirst("processing")),
      returns: orders
        .filter((order) => order.returnStatus === "requested")
        .sort(oldestFirst("returns")),
    };
  }, [orders]);

  const activeQueue = queues[queueTab];
  const recentOrders = useMemo(
    () =>
      [...orders].sort((a, b) => getOrderTime(b) - getOrderTime(a)).slice(0, 5),
    [orders],
  );

  const goToOrders = (filter) => {
    setActiveFilter(filter);
    setActivePage("orders");
  };

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

  const canCancel = (order) =>
    order.orderStatus?.toLowerCase() === "pending" &&
    order.paymentStatus !== "completed";

  const renderQueueAction = (order) => {
    if (queueTab === "pending") {
      return (
        <button
          type="button"
          className="representative-btn representative-btn-primary"
          disabled={updatingId === order._id}
          onClick={() => updateStatus(order, "processing")}
        >
          Start processing
        </button>
      );
    }
    if (queueTab === "processing") {
      return (
        <button
          type="button"
          className="representative-btn representative-btn-primary"
          onClick={() => handleStatusChange(order, "shipped")}
        >
          Mark as shipped
        </button>
      );
    }
    return (
      <button
        type="button"
        className="representative-btn representative-btn-primary"
        onClick={() => setSelectedOrder(order)}
      >
        Review return
      </button>
    );
  };

  return (
    <main className="representative-page">
      <RepresentativeNavbar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={logout}
      />

      <section className="representative-content">
        <header className="representative-header">
          <div>
            <p>ORDER MANAGEMENT</p>
            <h1>
              {activePage === "dashboard" ? "Dashboard" : "Product Orders"}
            </h1>
            {activePage === "dashboard" && (
              <span>Track order activity at a glance.</span>
            )}
            {activePage === "orders" && (
              <span>View and manage customer orders.</span>
            )}
          </div>
          {activePage === "dashboard" && <time>{dateLabel}</time>}
        </header>

        {notice && (
          <div className="representative-notice" role="status">
            {notice}
          </div>
        )}
        {error && !shipOrder && !selectedOrder && (
          <div className="representative-error" role="alert">
            {error}
          </div>
        )}

        {activePage === "dashboard" ? (
          <>
            <section className="representative-stats" aria-label="Order totals">
              <article className="representative-stat representative-stat-total">
                <span>Total Orders</span>
                <strong>{orders.length}</strong>
                <small>all time</small>
              </article>
              <article className="representative-stat">
                <span>Pending</span>
                <strong>{counts.pending || 0}</strong>
                <small>awaiting action</small>
              </article>
              <article className="representative-stat">
                <span>Processing</span>
                <strong>{counts.processing || 0}</strong>
                <small>being prepared</small>
              </article>
              <article className="representative-stat">
                <span>Shipped</span>
                <strong>{counts.shipped || 0}</strong>
                <small>on the way</small>
              </article>
              <article className="representative-stat">
                <span>Delivered</span>
                <strong>{counts.delivered || 0}</strong>
                <small>completed</small>
              </article>
            </section>

            <section className="representative-dashboard-grid">
              <article className="representative-card representative-status-card">
                <h2>Order Status</h2>
                <p>Share of all orders</p>
                <div className="representative-donut-wrap">
                  <div className="representative-donut" style={donutStyle}>
                    <div>
                      <strong>{orders.length}</strong>
                      <span>orders</span>
                    </div>
                  </div>
                </div>
                <div className="representative-legend">
                  {STATUSES.map((status) => (
                    <div key={status}>
                      <span className={`representative-dot ${status}`}></span>
                      <span className="representative-legend-label">
                        {formatStatus(status)}
                      </span>
                      <strong>{counts[status] || 0}</strong>
                      <small>{statusPercent(status)}%</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="representative-card representative-queue-card">
                <div className="representative-card-heading">
                  <div>
                    <h2>Action Required</h2>
                    <p>Orders waiting for your next step.</p>
                  </div>
                  <button
                    type="button"
                    className="representative-btn representative-btn-ghost"
                    onClick={() =>
                      goToOrders(queueTab === "returns" ? "returns" : queueTab)
                    }
                  >
                    View all
                  </button>
                </div>

                <div
                  className="representative-queue-tabs"
                  role="tablist"
                  aria-label="Order queues"
                >
                  {QUEUE_TABS.map((tab) => (
                    <button
                      type="button"
                      role="tab"
                      key={tab.key}
                      aria-selected={queueTab === tab.key}
                      className={queueTab === tab.key ? "active" : ""}
                      onClick={() => setQueueTab(tab.key)}
                    >
                      {tab.label}
                      <span>{queues[tab.key].length}</span>
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="representative-queue-empty">
                    Loading orders...
                  </div>
                ) : activeQueue.length === 0 ? (
                  <div className="representative-queue-empty">
                    {QUEUE_EMPTY[queueTab]}
                  </div>
                ) : (
                  <ul className="representative-queue-list">
                    {activeQueue.slice(0, 5).map((order) => {
                      const age = getQueueAge(order, queueTab);
                      const name = getCustomerName(order);
                      return (
                        <li
                          className="representative-queue-row"
                          key={order._id}
                        >
                          <span
                            className="representative-avatar"
                            aria-hidden="true"
                          >
                            {getInitials(name)}
                          </span>
                          <div className="representative-queue-main">
                            <strong>
                              #{order.orderReference || order._id}
                            </strong>
                            <span>
                              {name} · {getItemCount(order)} item
                              {getItemCount(order) === 1 ? "" : "s"} ·{" "}
                              {formatPrice(order.totalPrice)}
                            </span>
                          </div>
                          {age.label && (
                            <span className={`representative-age ${age.level}`}>
                              {age.label}
                            </span>
                          )}
                          <div className="representative-queue-actions">
                            <button
                              type="button"
                              className="representative-btn representative-btn-ghost"
                              onClick={() => setSelectedOrder(order)}
                            >
                              Details
                            </button>
                            {renderQueueAction(order)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {activeQueue.length > 5 && (
                  <button
                    type="button"
                    className="representative-more"
                    onClick={() =>
                      goToOrders(queueTab === "returns" ? "returns" : queueTab)
                    }
                  >
                    {activeQueue.length - 5} more order
                    {activeQueue.length - 5 === 1 ? "" : "s"} in this queue
                  </button>
                )}
              </article>
            </section>

            <section className="representative-card representative-recent-card">
              <div className="representative-card-heading">
                <div>
                  <h2>Latest Orders</h2>
                  <p>The 5 most recent orders.</p>
                </div>
                <button
                  type="button"
                  className="representative-btn representative-btn-ghost"
                  onClick={() => goToOrders("all")}
                >
                  View all orders
                </button>
              </div>
              <div className="representative-table-wrap">
                <table className="representative-table representative-table-compact">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>
                        <span className="representative-sr">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="representative-empty">
                          {loading ? "Loading orders..." : "No orders yet."}
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => {
                        const status =
                          order.orderStatus?.toLowerCase() || "pending";
                        return (
                          <tr key={order._id}>
                            <td>
                              <strong>
                                #{order.orderReference || order._id}
                              </strong>
                            </td>
                            <td>
                              {formatDate(order.orderDate || order.createdAt)}
                            </td>
                            <td>{getCustomerName(order)}</td>
                            <td>
                              <strong>{formatPrice(order.totalPrice)}</strong>
                            </td>
                            <td>
                              <span
                                className={`representative-badge ${status}`}
                              >
                                {formatStatus(status)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="representative-view"
                                onClick={() => setSelectedOrder(order)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <RepresentativeProductOrders
            orders={orders}
            loading={loading}
            counts={counts}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            updatingId={updatingId}
            onViewOrder={setSelectedOrder}
            onStatusChange={handleStatusChange}
            onNotice={setNotice}
          />
        )}
      </section>

      {selectedOrder && (
        <div
          className="representative-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrder(null);
          }}
        >
          <div
            className="representative-modal representative-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
          >
            <header className="representative-modal-header">
              <div>
                <p className="representative-modal-eyebrow">ORDER DETAILS</p>
                <h2 id="order-modal-title">
                  #{selectedOrder.orderReference || selectedOrder._id}
                </h2>
                <p className="representative-modal-sub">
                  Placed{" "}
                  {formatDate(
                    selectedOrder.orderDate || selectedOrder.createdAt,
                  )}
                  {formatTime(
                    selectedOrder.orderDate || selectedOrder.createdAt,
                  )
                    ? ` · ${formatTime(selectedOrder.orderDate || selectedOrder.createdAt)}`
                    : ""}
                </p>
              </div>
              <div className="representative-modal-header-side">
                <span
                  className={`representative-badge ${selectedOrder.orderStatus?.toLowerCase() || "pending"}`}
                >
                  {formatStatus(selectedOrder.orderStatus)}
                </span>
                <button
                  type="button"
                  className="representative-modal-close"
                  aria-label="Close order details"
                  onClick={() => setSelectedOrder(null)}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </header>

            <div className="representative-modal-body">
              {error && (
                <div className="representative-error" role="alert">
                  {error}
                </div>
              )}

              <div className="representative-modal-grid">
                <div>
                  <span>Customer</span>
                  <strong>{getCustomerName(selectedOrder)}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>
                    {selectedOrder.paymentMethod
                      ? `${selectedOrder.paymentMethod} · `
                      : ""}
                    {formatStatus(selectedOrder.paymentStatus)}
                  </strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatPrice(selectedOrder.totalPrice)}</strong>
                </div>
                <div>
                  <span>Items</span>
                  <strong>{getItemCount(selectedOrder)}</strong>
                </div>
              </div>

              <section className="representative-modal-section">
                <h3>Items</h3>
                <div className="representative-products">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      className="representative-product"
                      key={item._id || index}
                    >
                      <div>
                        <strong>{getProductName(item)}</strong>
                        <span>
                          Size {item.size || "—"} · {item.color || "—"} · Qty{" "}
                          {item.quantity || 1}
                        </span>
                      </div>
                      <strong>
                        {formatPrice(
                          Number(item.price || 0) * Number(item.quantity || 1),
                        )}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>

              <div className="representative-info-grid">
                {selectedOrder.customerInfo && (
                  <section className="representative-modal-section">
                    <h3>Delivery address</h3>
                    <p>
                      {[
                        selectedOrder.customerInfo.address,
                        selectedOrder.customerInfo.city,
                        selectedOrder.customerInfo.province,
                        selectedOrder.customerInfo.zipCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {selectedOrder.customerInfo.phone && (
                      <p>{selectedOrder.customerInfo.phone}</p>
                    )}
                    {selectedOrder.customerInfo.email && (
                      <p>{selectedOrder.customerInfo.email}</p>
                    )}
                  </section>
                )}

                <section className="representative-modal-section">
                  <h3>Shipment</h3>
                  {selectedOrder.courier || selectedOrder.trackingNumber ? (
                    <>
                      <p>{selectedOrder.courier || "—"}</p>
                      <p>Tracking: {selectedOrder.trackingNumber || "—"}</p>
                      {selectedOrder.estimatedDelivery && (
                        <p>
                          Estimated delivery:{" "}
                          {formatDate(selectedOrder.estimatedDelivery)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="representative-muted">Not shipped yet.</p>
                  )}
                </section>
              </div>

              {selectedOrder.statusHistory?.length > 0 && (
                <section className="representative-modal-section">
                  <h3>Status history</h3>
                  <ol className="representative-timeline">
                    {[...selectedOrder.statusHistory]
                      .reverse()
                      .map((entry, index) => (
                        <li key={entry._id || index}>
                          <span
                            className={`representative-timeline-dot ${entry.status}`}
                            aria-hidden="true"
                          />
                          <div>
                            <strong>{formatStatus(entry.status)}</strong>
                            <span>
                              {formatDate(entry.changedAt)}
                              {formatTime(entry.changedAt)
                                ? ` · ${formatTime(entry.changedAt)}`
                                : ""}
                              {entry.note ? ` · ${entry.note}` : ""}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ol>
                </section>
              )}

              {selectedOrder.returnStatus && (
                <section className="representative-return">
                  <h3>
                    Return request · {RETURN_LABELS[selectedOrder.returnStatus]}
                  </h3>
                  {selectedOrder.returnReason && (
                    <p>Customer reason: {selectedOrder.returnReason}</p>
                  )}
                  {selectedOrder.returnNote && (
                    <p>Your note: {selectedOrder.returnNote}</p>
                  )}
                  {["requested", "approved"].includes(
                    selectedOrder.returnStatus,
                  ) && (
                    <>
                      <label htmlFor="return-note">
                        Note to customer (optional)
                      </label>
                      <textarea
                        id="return-note"
                        rows="2"
                        maxLength={300}
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                      />
                      <div className="representative-actions-row">
                        {selectedOrder.returnStatus === "requested" && (
                          <>
                            <button
                              type="button"
                              className="representative-btn representative-btn-primary"
                              disabled={updatingId === selectedOrder._id}
                              onClick={() =>
                                resolveReturn(selectedOrder, "approve")
                              }
                            >
                              Approve return
                            </button>
                            <button
                              type="button"
                              className="representative-btn representative-btn-danger"
                              disabled={updatingId === selectedOrder._id}
                              onClick={() =>
                                resolveReturn(selectedOrder, "reject")
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {selectedOrder.returnStatus === "approved" && (
                          <button
                            type="button"
                            className="representative-btn representative-btn-primary"
                            disabled={updatingId === selectedOrder._id}
                            onClick={() =>
                              resolveReturn(selectedOrder, "refund")
                            }
                          >
                            Mark as refunded
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            <footer className="representative-modal-footer">
              {canCancel(selectedOrder) ? (
                confirmCancelId === selectedOrder._id ? (
                  <div className="representative-confirm">
                    <span>Cancel this order? Stock will be restored.</span>
                    <button
                      type="button"
                      className="representative-btn representative-btn-ghost"
                      onClick={() => setConfirmCancelId("")}
                    >
                      Keep order
                    </button>
                    <button
                      type="button"
                      className="representative-btn representative-btn-danger"
                      disabled={updatingId === selectedOrder._id}
                      onClick={() => cancelOrder(selectedOrder)}
                    >
                      Yes, cancel order
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="representative-btn representative-btn-danger-ghost"
                    onClick={() => setConfirmCancelId(selectedOrder._id)}
                  >
                    Cancel order
                  </button>
                )
              ) : (
                <span />
              )}
              <button
                type="button"
                className="representative-btn representative-btn-ghost"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {shipOrder && (
        <div
          className="representative-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShipOrder(null);
          }}
        >
          <form
            className="representative-modal representative-ship-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ship-modal-title"
            onSubmit={submitShipForm}
          >
            <header className="representative-modal-header">
              <div>
                <p className="representative-modal-eyebrow">SHIPPING DETAILS</p>
                <h2 id="ship-modal-title">
                  #{shipOrder.orderReference || shipOrder._id}
                </h2>
                <p className="representative-modal-sub">
                  Customers will see this on their tracking page.
                </p>
              </div>
              <button
                type="button"
                className="representative-modal-close"
                aria-label="Close shipping details"
                onClick={() => setShipOrder(null)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </header>

            <div className="representative-modal-body">
              {error && (
                <div className="representative-error" role="alert">
                  {error}
                </div>
              )}

              <div className="representative-field">
                <label htmlFor="ship-courier">Courier</label>
                <input
                  id="ship-courier"
                  type="text"
                  value={shipForm.courier}
                  onChange={(event) =>
                    setShipForm({ ...shipForm, courier: event.target.value })
                  }
                  placeholder="e.g. J&T Express"
                  required
                />
              </div>
              <div className="representative-field">
                <label htmlFor="ship-tracking">Tracking number</label>
                <input
                  id="ship-tracking"
                  type="text"
                  value={shipForm.trackingNumber}
                  onChange={(event) =>
                    setShipForm({
                      ...shipForm,
                      trackingNumber: event.target.value,
                    })
                  }
                  placeholder="Enter the courier's tracking number"
                  required
                />
              </div>
              <div className="representative-field">
                <label htmlFor="ship-eta">
                  Estimated delivery date{" "}
                  <span className="representative-optional">(optional)</span>
                </label>
                <input
                  id="ship-eta"
                  type="date"
                  value={shipForm.estimatedDelivery}
                  onChange={(event) =>
                    setShipForm({
                      ...shipForm,
                      estimatedDelivery: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <footer className="representative-modal-footer representative-modal-footer-end">
              <button
                type="button"
                className="representative-btn representative-btn-ghost"
                onClick={() => setShipOrder(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="representative-btn representative-btn-primary"
                disabled={updatingId === shipOrder._id}
              >
                {updatingId === shipOrder._id ? "Saving..." : "Mark as shipped"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
