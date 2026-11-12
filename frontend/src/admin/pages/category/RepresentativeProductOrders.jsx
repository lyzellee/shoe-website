import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExcel,
  faFilter,
  faMagnifyingGlass,
  faSort,
} from "@fortawesome/free-solid-svg-icons";
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
import "./RepresentativeProductOrders.css";

const ORDERS_PER_PAGE = 8;

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

/**
 * Product Orders page: search, sort, filter, export, status tabs, table.
 * Order data and the modals (details / shipping) live in the parent
 * (RepresentativeDashboard) and are reached through the props below.
 */
export default function RepresentativeProductOrders({
  orders,
  loading,
  counts,
  activeFilter,
  onFilterChange,
  updatingId,
  onViewOrder,
  onStatusChange,
  onNotice,
}) {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState("");
  const toolbarRef = useRef(null);

  // Esc and clicking outside close the sort/filter menus
  useEffect(() => {
    if (!openMenu) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenMenu("");
    };
    const handlePointerDown = (event) => {
      if (!toolbarRef.current?.contains(event.target)) setOpenMenu("");
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenu]);

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
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice(`Exported ${rows.length} order${rows.length === 1 ? "" : "s"}.`);
  };

  const resetFilters = () => {
    setPaymentFilter("all");
    setDateFilter("all");
  };

  return (
    <section className="representative-orders-page">
      <div className="representative-toolbar" ref={toolbarRef}>
        <div className="representative-toolbar-actions">
          <div className="representative-menu-wrap">
            <button
              type="button"
              className={`representative-tool-btn ${openMenu === "sort" ? "open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={openMenu === "sort"}
              onClick={() => setOpenMenu(openMenu === "sort" ? "" : "sort")}
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
              onClick={() => setOpenMenu(openMenu === "filter" ? "" : "filter")}
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
              onClick={() => onFilterChange(value)}
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
                        <strong>#{order.orderReference || order._id}</strong>
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
                          value={order.orderStatus?.toLowerCase() || "pending"}
                          disabled={
                            updatingId === order._id ||
                            order.orderStatus === "cancelled"
                          }
                          onChange={(event) =>
                            onStatusChange(order, event.target.value)
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
                            {RETURN_LABELS[order.returnStatus]?.toLowerCase()}
                          </small>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="representative-view"
                          onClick={() => onViewOrder(order)}
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
  );
}
