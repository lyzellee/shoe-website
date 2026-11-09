import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RepresentativeDashboard.css";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);
const STATUSES = ["pending", "processing", "shipped", "delivered"];
const ORDERS_PER_PAGE = 8;

const RETURN_LABELS = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
};

const waitingLabel = (order) => {
  const placed = new Date(order.orderDate || order.createdAt || 0).getTime();
  if (!placed) return "";
  const days = Math.floor((Date.now() - placed) / 86400000);
  if (days < 1) return "waiting since today";
  return `waiting ${days} day${days === 1 ? "" : "s"}`;
};

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value || 0),
  );

const formatStatus = (status) =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";

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
  const [shipOrder, setShipOrder] = useState(null);
  const [shipForm, setShipForm] = useState({
    courier: "",
    trackingNumber: "",
    estimatedDelivery: "",
  });
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const [returnNote, setReturnNote] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
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

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    if (activeFilter === "returns") {
      return orders.filter((order) => Boolean(order.returnStatus));
    }
    return orders.filter(
      (order) => order.orderStatus?.toLowerCase() === activeFilter,
    );
  }, [orders, activeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );
  const visibleOrders = filteredOrders.slice(
    (page - 1) * ORDERS_PER_PAGE,
    page * ORDERS_PER_PAGE,
  );

  useEffect(() => setPage(1), [activeFilter]);

  const getCustomerName = (order) =>
    order.customerInfo
      ? `${order.customerInfo.firstName || ""} ${order.customerInfo.lastName || ""}`.trim()
      : "Customer";

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

  // Oldest pending orders first, so the longest-waiting order is on top
  const pendingOrders = orders
    .filter((order) => order.orderStatus?.toLowerCase() === "pending")
    .sort(
      (a, b) =>
        new Date(a.orderDate || 0).getTime() -
        new Date(b.orderDate || 0).getTime(),
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
        <nav
          className="representative-nav"
          aria-label="Representative navigation"
        >
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
        <button className="representative-logout" onClick={logout}>
          Log out
        </button>
      </aside>

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

        {notice && <div className="representative-notice">{notice}</div>}
        {error && <div className="representative-error">{error}</div>}

        {activePage === "dashboard" ? (
          <>
            <section className="representative-stats">
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

              <article className="representative-card representative-attention-card">
                <div className="representative-card-heading">
                  <div>
                    <h2>Needs Your Attention</h2>
                    <p>Pending orders waiting to be picked up.</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveFilter("pending");
                      setActivePage("orders");
                    }}
                  >
                    View all orders
                  </button>
                </div>
                <div className="representative-attention-list">
                  {loading ? (
                    <div className="representative-attention-empty">
                      Loading orders...
                    </div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="representative-attention-empty">
                      No pending orders need attention.
                    </div>
                  ) : (
                    pendingOrders.slice(0, 4).map((order) => (
                      <div
                        className="representative-attention-row"
                        key={order._id}
                      >
                        <div>
                          <strong>#{order.orderReference || order._id}</strong>
                          <span>
                            {getCustomerName(order)} ·{" "}
                            {order.items?.length || 0} item(s) ·{" "}
                            {formatPrice(order.totalPrice)}
                            {waitingLabel(order)
                              ? ` · ${waitingLabel(order)}`
                              : ""}
                          </span>
                        </div>
                        <span className="representative-mini-status">
                          Pending
                        </span>
                        <button onClick={() => setSelectedOrder(order)}>
                          Review order
                        </button>
                      </div>
                    ))
                  )}
                  {pendingOrders.length > 4 && (
                    <button
                      className="representative-more"
                      onClick={() => {
                        setActiveFilter("pending");
                        setActivePage("orders");
                      }}
                    >
                      {pendingOrders.length - 4} more pending order
                      {pendingOrders.length - 4 === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : (
          <section className="representative-orders-card">
            <div className="representative-orders-heading">
              <div>
                <h2>All Orders</h2>
                <p>Use the status menu to move an order forward.</p>
              </div>
              <div className="representative-filter-pills">
                {[
                  ["all", orders.length, "All"],
                  ["pending", counts.pending || 0, "Pending"],
                  ["processing", counts.processing || 0, "Processing"],
                  ["shipped", counts.shipped || 0, "Shipped"],
                  ["delivered", counts.delivered || 0, "Delivered"],
                  ["cancelled", counts.cancelled || 0, "Cancelled"],
                  ["returns", counts.returns || 0, "Returns"],
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
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="representative-empty">
                        Loading orders...
                      </td>
                    </tr>
                  ) : visibleOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="representative-empty">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    visibleOrders.map((order) => {
                      const currentIndex = STATUSES.indexOf(
                        order.orderStatus?.toLowerCase(),
                      );
                      return (
                        <tr key={order._id}>
                          <td>
                            <strong>
                              #{order.orderReference || order._id}
                            </strong>
                          </td>
                          <td>{getCustomerName(order)}</td>
                          <td>
                            {order.items?.reduce(
                              (total, item) =>
                                total + Number(item.quantity || 0),
                              0,
                            ) || 0}
                          </td>
                          <td>
                            <strong>{formatPrice(order.totalPrice)}</strong>
                          </td>
                          <td>
                            <select
                              className={`representative-status representative-status-${order.orderStatus?.toLowerCase()}`}
                              value={
                                order.orderStatus?.toLowerCase() || "pending"
                              }
                              disabled={
                                updatingId === order._id ||
                                order.orderStatus === "cancelled"
                              }
                              onChange={(event) =>
                                handleStatusChange(order, event.target.value)
                              }
                            >
                              {STATUSES.map((status, index) => (
                                <option
                                  key={status}
                                  value={status}
                                  disabled={index < currentIndex}
                                >
                                  {formatStatus(status)}
                                </option>
                              ))}
                              {order.orderStatus === "cancelled" && (
                                <option value="cancelled">Cancelled</option>
                              )}
                            </select>
                            {order.returnStatus && (
                              <small className="representative-return-tag">
                                Return{" "}
                                {RETURN_LABELS[
                                  order.returnStatus
                                ]?.toLowerCase()}
                              </small>
                            )}
                          </td>
                          <td>
                            <button
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
            <footer className="representative-table-footer">
              <span>
                Showing {visibleOrders.length} of {filteredOrders.length} orders
              </span>
              <div>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  ‹
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  ›
                </button>
              </div>
            </footer>
          </section>
        )}
      </section>

      {selectedOrder && (
        <div
          className="representative-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrder(null);
          }}
        >
          <div className="representative-modal" role="dialog" aria-modal="true">
            <button
              className="representative-modal-close"
              onClick={() => setSelectedOrder(null)}
            >
              ×
            </button>
            <p className="representative-modal-eyebrow">ORDER DETAILS</p>
            <h2>#{selectedOrder.orderReference || selectedOrder._id}</h2>
            <div className="representative-modal-grid">
              <div>
                <span>Customer</span>
                <strong>{getCustomerName(selectedOrder)}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>{formatStatus(selectedOrder.paymentStatus)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatPrice(selectedOrder.totalPrice)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{formatStatus(selectedOrder.orderStatus)}</strong>
              </div>
            </div>
            <div className="representative-products">
              {selectedOrder.items?.map((item, index) => {
                const shoe = item.shoeId || {};
                return (
                  <div
                    className="representative-product"
                    key={item._id || index}
                  >
                    <div>
                      <strong>{shoe.name || item.name || "Product"}</strong>
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
                );
              })}
            </div>

            {error && <div className="representative-error">{error}</div>}

            <div className="representative-detail-sections">
              {selectedOrder.customerInfo && (
                <section>
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
                  <p>
                    {[
                      selectedOrder.customerInfo.phone,
                      selectedOrder.customerInfo.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </section>
              )}

              <section>
                <h3>Payment</h3>
                <p>
                  {selectedOrder.paymentMethod || "—"} ·{" "}
                  {formatStatus(selectedOrder.paymentStatus)}
                </p>
              </section>

              {(selectedOrder.courier || selectedOrder.trackingNumber) && (
                <section>
                  <h3>Shipment</h3>
                  <p>{selectedOrder.courier || "—"}</p>
                  <p>Tracking: {selectedOrder.trackingNumber || "—"}</p>
                  {selectedOrder.estimatedDelivery && (
                    <p>
                      Estimated delivery:{" "}
                      {new Date(
                        selectedOrder.estimatedDelivery,
                      ).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </section>
              )}

              {selectedOrder.statusHistory?.length > 0 && (
                <section>
                  <h3>Status history</h3>
                  <ul>
                    {[...selectedOrder.statusHistory]
                      .reverse()
                      .map((entry, index) => (
                        <li key={entry._id || index}>
                          <strong>{formatStatus(entry.status)}</strong>
                          <span>
                            {entry.changedAt
                              ? new Date(entry.changedAt).toLocaleString(
                                  "en-PH",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  },
                                )
                              : ""}
                            {entry.note ? ` · ${entry.note}` : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </div>

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
                    <div className="representative-modal-actions">
                      {selectedOrder.returnStatus === "requested" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingId === selectedOrder._id}
                            onClick={() =>
                              resolveReturn(selectedOrder, "approve")
                            }
                          >
                            Approve return
                          </button>
                          <button
                            type="button"
                            className="representative-danger"
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
                          disabled={updatingId === selectedOrder._id}
                          onClick={() => resolveReturn(selectedOrder, "refund")}
                        >
                          Mark as refunded
                        </button>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            {selectedOrder.orderStatus?.toLowerCase() === "pending" &&
              selectedOrder.paymentStatus !== "completed" && (
                <div className="representative-modal-actions">
                  {confirmCancelId === selectedOrder._id ? (
                    <>
                      <span>Cancel this order? Stock will be restored.</span>
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId("")}
                      >
                        Keep order
                      </button>
                      <button
                        type="button"
                        className="representative-danger"
                        disabled={updatingId === selectedOrder._id}
                        onClick={() => cancelOrder(selectedOrder)}
                      >
                        Yes, cancel order
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="representative-danger"
                      onClick={() => setConfirmCancelId(selectedOrder._id)}
                    >
                      Cancel order
                    </button>
                  )}
                </div>
              )}
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
            className="representative-modal representative-ship-form"
            role="dialog"
            aria-modal="true"
            aria-label="Shipping details"
            onSubmit={submitShipForm}
          >
            <button
              type="button"
              className="representative-modal-close"
              aria-label="Close"
              onClick={() => setShipOrder(null)}
            >
              ×
            </button>
            <p className="representative-modal-eyebrow">SHIPPING DETAILS</p>
            <h2>#{shipOrder.orderReference || shipOrder._id}</h2>
            {error && <div className="representative-error">{error}</div>}
            <label>
              Courier
              <input
                type="text"
                value={shipForm.courier}
                onChange={(event) =>
                  setShipForm({ ...shipForm, courier: event.target.value })
                }
                placeholder="e.g. J&T Express"
                required
              />
            </label>
            <label>
              Tracking number
              <input
                type="text"
                value={shipForm.trackingNumber}
                onChange={(event) =>
                  setShipForm({
                    ...shipForm,
                    trackingNumber: event.target.value,
                  })
                }
                required
              />
            </label>
            <label>
              Estimated delivery date
              <input
                type="date"
                value={shipForm.estimatedDelivery}
                onChange={(event) =>
                  setShipForm({
                    ...shipForm,
                    estimatedDelivery: event.target.value,
                  })
                }
              />
            </label>
            <div className="representative-form-actions">
              <button type="button" onClick={() => setShipOrder(null)}>
                Cancel
              </button>
              <button type="submit" disabled={updatingId === shipOrder._id}>
                {updatingId === shipOrder._id ? "Saving..." : "Mark as shipped"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
