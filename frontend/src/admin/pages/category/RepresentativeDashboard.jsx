import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faFileExcel,
  faFilter,
  faMagnifyingGlass,
  faSort,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import "./RepresentativeDashboard.css";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);
const STATUSES = ["pending", "processing", "shipped", "delivered"];
const ORDERS_PER_PAGE = 8;
const DAY = 24 * 60 * 60 * 1000;

const RETURN_LABELS = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
};

const SORT_OPTIONS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "total-high", label: "Total: high to low" },
  { key: "total-low", label: "Total: low to high" },
  { key: "customer", label: "Customer A–Z" },
];

const PAYMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

const DATE_FILTERS = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

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

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value || 0),
  );

const formatStatus = (status) =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";

const getOrderTime = (order) =>
  new Date(order.orderDate || order.createdAt || 0).getTime() || 0;

const formatDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getCustomerName = (order) =>
  order.customerInfo
    ? `${order.customerInfo.firstName || ""} ${order.customerInfo.lastName || ""}`.trim() ||
      "Customer"
    : "Customer";

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "C";

const getItemCount = (order) =>
  order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) ||
  0;

const getProductName = (item) =>
  (item.shoeId && item.shoeId.name) || item.name || "Product";

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

// Spreadsheet-safe CSV cell (blocks formula injection such as =cmd|...)
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const getDateStart = (key) => {
  if (key === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (key === "7d") return Date.now() - 7 * DAY;
  if (key === "30d") return Date.now() - 30 * DAY;
  return 0;
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
  const [page, setPage] = useState(1);
  const [shipOrder, setShipOrder] = useState(null);
  const [shipForm, setShipForm] = useState({
    courier: "",
    trackingNumber: "",
    estimatedDelivery: "",
  });
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState("");
  const [queueTab, setQueueTab] = useState("pending");
  const toolbarRef = useRef(null);
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

  // Esc closes menus and modals; clicking outside closes the sort/filter menus
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (openMenu) setOpenMenu("");
      else if (shipOrder) setShipOrder(null);
      else if (selectedOrder) setSelectedOrder(null);
    };
    const handlePointerDown = (event) => {
      if (openMenu && !toolbarRef.current?.contains(event.target))
        setOpenMenu("");
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenu, shipOrder, selectedOrder]);

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
    const query = searchQuery.trim().toLowerCase();
    const dateStart = getDateStart(dateFilter);

    const matches = orders.filter((order) => {
      const status = order.orderStatus?.toLowerCase();
      if (activeFilter === "returns") {
        if (!order.returnStatus) return false;
      } else if (activeFilter !== "all" && status !== activeFilter) {
        return false;
      }
      if (paymentFilter === "paid" && order.paymentStatus !== "completed")
        return false;
      if (paymentFilter === "unpaid" && order.paymentStatus === "completed")
        return false;
      if (dateFilter !== "all" && getOrderTime(order) < dateStart) return false;
      if (query) {
        const haystack = [
          order.orderReference,
          getCustomerName(order),
          order.customerInfo?.phone,
          order.customerInfo?.email,
          order.courier,
          order.trackingNumber,
          ...(order.items || []).map(getProductName),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const sorters = {
      newest: (a, b) => getOrderTime(b) - getOrderTime(a),
      oldest: (a, b) => getOrderTime(a) - getOrderTime(b),
      "total-high": (a, b) =>
        Number(b.totalPrice || 0) - Number(a.totalPrice || 0),
      "total-low": (a, b) =>
        Number(a.totalPrice || 0) - Number(b.totalPrice || 0),
      customer: (a, b) => getCustomerName(a).localeCompare(getCustomerName(b)),
    };
    return [...matches].sort(sorters[sortKey] || sorters.newest);
  }, [orders, activeFilter, searchQuery, sortKey, paymentFilter, dateFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE,
  );
  const activeFilterCount =
    (paymentFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  useEffect(
    () => setPage(1),
    [activeFilter, searchQuery, sortKey, paymentFilter, dateFilter],
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

  // Download the orders currently shown (all pages) as a CSV that opens in Excel
  const exportOrders = () => {
    const header = [
      "Reference",
      "Date",
      "Customer",
      "Phone",
      "Items",
      "Total (PHP)",
      "Payment method",
      "Payment status",
      "Order status",
      "Courier",
      "Tracking number",
    ];
    const rows = filteredOrders.map((order) => [
      order.orderReference || order._id,
      formatDate(order.orderDate || order.createdAt),
      getCustomerName(order),
      order.customerInfo?.phone || "",
      getItemCount(order),
      Number(order.totalPrice || 0).toFixed(2),
      order.paymentMethod || "",
      formatStatus(order.paymentStatus),
      formatStatus(order.orderStatus),
      order.courier || "",
      order.trackingNumber || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${rows.length} order${rows.length === 1 ? "" : "s"}.`);
  };

  const resetFilters = () => {
    setPaymentFilter("all");
    setDateFilter("all");
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
      <aside className="representative-sidebar">
        <div className="representative-brand">SHOE WEBSITE</div>
        <nav
          className="representative-nav"
          aria-label="Representative navigation"
        >
          <button
            type="button"
            className={activePage === "dashboard" ? "active" : ""}
            aria-current={activePage === "dashboard" ? "page" : undefined}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activePage === "orders" ? "active" : ""}
            aria-current={activePage === "orders" ? "page" : undefined}
            onClick={() => setActivePage("orders")}
          >
            Orders
          </button>
        </nav>
        <button
          type="button"
          className="representative-logout"
          onClick={logout}
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
          <span>Log out</span>
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
          <section className="representative-orders-page">
            <div className="representative-toolbar" ref={toolbarRef}>
              <div className="representative-toolbar-actions">
                <div className="representative-menu-wrap">
                  <button
                    type="button"
                    className={`representative-tool-btn ${openMenu === "sort" ? "open" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenu === "sort"}
                    onClick={() =>
                      setOpenMenu(openMenu === "sort" ? "" : "sort")
                    }
                  >
                    <FontAwesomeIcon icon={faSort} />
                    <span>Sort</span>
                  </button>
                  {openMenu === "sort" && (
                    <div
                      className="representative-menu"
                      role="menu"
                      aria-label="Sort orders"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={sortKey === option.key}
                          key={option.key}
                          className={sortKey === option.key ? "selected" : ""}
                          onClick={() => {
                            setSortKey(option.key);
                            setOpenMenu("");
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="representative-menu-wrap">
                  <button
                    type="button"
                    className={`representative-tool-btn ${openMenu === "filter" ? "open" : ""}`}
                    aria-haspopup="dialog"
                    aria-expanded={openMenu === "filter"}
                    onClick={() =>
                      setOpenMenu(openMenu === "filter" ? "" : "filter")
                    }
                  >
                    <FontAwesomeIcon icon={faFilter} />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="representative-tool-count">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  {openMenu === "filter" && (
                    <div
                      className="representative-menu representative-filter-panel"
                      role="dialog"
                      aria-label="Filter orders"
                    >
                      <fieldset>
                        <legend>Payment</legend>
                        {PAYMENT_FILTERS.map((option) => (
                          <label key={option.key}>
                            <input
                              type="radio"
                              name="payment-filter"
                              checked={paymentFilter === option.key}
                              onChange={() => setPaymentFilter(option.key)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </fieldset>
                      <fieldset>
                        <legend>Date placed</legend>
                        {DATE_FILTERS.map((option) => (
                          <label key={option.key}>
                            <input
                              type="radio"
                              name="date-filter"
                              checked={dateFilter === option.key}
                              onChange={() => setDateFilter(option.key)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </fieldset>
                      <button
                        type="button"
                        className="representative-menu-reset"
                        disabled={activeFilterCount === 0}
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="representative-tool-btn"
                  onClick={exportOrders}
                  disabled={filteredOrders.length === 0}
                >
                  <FontAwesomeIcon icon={faFileExcel} />
                  <span>Export</span>
                </button>
              </div>

              <label className="representative-search">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span className="representative-sr">Search orders</span>
                <input
                  type="search"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
            </div>

            <section className="representative-orders-card">
              <div
                className="representative-filter-pills"
                role="group"
                aria-label="Filter by status"
              >
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
                    type="button"
                    key={value}
                    className={activeFilter === value ? "active" : ""}
                    aria-pressed={activeFilter === value}
                    onClick={() => setActiveFilter(value)}
                  >
                    {label} <span>{count}</span>
                  </button>
                ))}
              </div>

              <div className="representative-table-wrap">
                <table className="representative-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Date</th>
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
                        <td colSpan="7" className="representative-empty">
                          Loading orders...
                        </td>
                      </tr>
                    ) : visibleOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="representative-empty">
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      visibleOrders.map((order) => {
                        const currentIndex = STATUSES.indexOf(
                          order.orderStatus?.toLowerCase(),
                        );
                        const placed = order.orderDate || order.createdAt;
                        return (
                          <tr key={order._id}>
                            <td>
                              <strong>
                                #{order.orderReference || order._id}
                              </strong>
                            </td>
                            <td>
                              <span className="representative-date">
                                {formatDate(placed)}
                              </span>
                              {formatTime(placed) && (
                                <small className="representative-time">
                                  {formatTime(placed)}
                                </small>
                              )}
                            </td>
                            <td>{getCustomerName(order)}</td>
                            <td>{getItemCount(order)}</td>
                            <td>
                              <strong>{formatPrice(order.totalPrice)}</strong>
                            </td>
                            <td>
                              <select
                                aria-label={`Status for order ${order.orderReference || order._id}`}
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
              <footer className="representative-table-footer">
                <span>
                  Showing {visibleOrders.length} of {filteredOrders.length}{" "}
                  orders
                </span>
                <div>
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ‹
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    ›
                  </button>
                </div>
              </footer>
            </section>
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
