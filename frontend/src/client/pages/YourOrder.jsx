import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import {
  addOrderToCart,
  loadCustomerOrders,
  readSavedOrders,
  formatMoney,
  formatOrderDate,
  getItemCount,
  getLineTotal,
  getOrderDate,
  getOrderReference,
  getItemShoe,
  getProductImage,
} from "./customerOrders.js";
import "./YourOrder.css";

const ORDER_STEPS = ["pending", "processing", "shipped", "delivered"];
const TABS = [
  { key: "all", label: "All" },
  { key: "to-pay", label: "To Pay" },
  { key: "to-ship", label: "To Ship" },
  { key: "to-receive", label: "To Receive" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "return-refund", label: "Return Refund" },
];

const normalizeStatus = (status) => (status || "pending").toLowerCase();
const isUnpaid = (order) => order.paymentStatus !== "completed";

const matchesTab = (order, tab) => {
  const status = normalizeStatus(order.orderStatus);
  switch (tab) {
    case "to-pay":
      return (
        status === "pending" && order.paymentMethod !== "COD" && isUnpaid(order)
      );
    case "to-ship":
      return ["pending", "processing"].includes(status);
    case "to-receive":
      return status === "shipped";
    case "completed":
      return status === "delivered";
    case "cancelled":
      return status === "cancelled";
    case "return-refund":
      return Boolean(order.returnStatus || order.refundStatus);
    default:
      return true;
  }
};

const getStepDate = (order, step) => {
  const history = order.statusHistory || [];
  const event = history.find((entry) => entry.status?.toLowerCase() === step);
  if (event?.changedAt) return formatOrderDate(event.changedAt);
  if (step === "pending") return formatOrderDate(getOrderDate(order));
  if (normalizeStatus(order.orderStatus) === step && order.updatedAt) {
    return formatOrderDate(order.updatedAt);
  }
  return "";
};

export default function YourOrder() {
  const [orders, setOrders] = useState(readSavedOrders);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");

  const refreshOrders = useCallback(async (initial = false) => {
    try {
      const result = await loadCustomerOrders();
      setOrders(result.orders);
      setError("");
      setRefreshError("");
    } catch (requestError) {
      const savedOrders = readSavedOrders();
      setOrders(savedOrders);
      if (savedOrders.length > 0) {
        setRefreshError(requestError.message);
        setError("");
      } else setError(requestError.message);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => refreshOrders(true), 0);
    const intervalId = window.setInterval(() => refreshOrders(), 60000);
    const handleFocus = () => refreshOrders();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const dateA = new Date(getOrderDate(a) || 0).getTime() || 0;
        const dateB = new Date(getOrderDate(b) || 0).getTime() || 0;
        // Delivered orders go to the bottom, everything else is newest first
        const deliveredA = normalizeStatus(a.orderStatus) === "delivered";
        const deliveredB = normalizeStatus(b.orderStatus) === "delivered";
        if (deliveredA !== deliveredB) return deliveredA ? 1 : -1;
        return dateB - dateA;
      }),
    [orders],
  );
  const visibleOrders = sortedOrders.filter((order) =>
    matchesTab(order, activeTab),
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((tab) => [
          tab.key,
          sortedOrders.filter((order) => matchesTab(order, tab.key)).length,
        ]),
      ),
    [sortedOrders],
  );

  const summary = useMemo(
    () => ({
      total: sortedOrders.length,
      inProgress: sortedOrders.filter((order) =>
        ["pending", "processing", "shipped"].includes(
          normalizeStatus(order.orderStatus),
        ),
      ).length,
      delivered: sortedOrders.filter(
        (order) => normalizeStatus(order.orderStatus) === "delivered",
      ).length,
    }),
    [sortedOrders],
  );

  const toggleOrder = (order) => {
    const reference = getOrderReference(order);
    setExpandedOrders((current) => ({
      ...current,
      [reference]: !current[reference],
    }));
  };

  const buyAgain = (order) => {
    try {
      addOrderToCart(order);
      window.location.assign("/cart");
    } catch (cartError) {
      setError(cartError.message || "Unable to add these items to your cart.");
    }
  };

  if (loading) {
    return (
      <main className="your-orders-page">
        <div className="your-orders-container">
          <div className="orders-loading">
            <span className="orders-spinner" />
            <p>Loading your orders...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && orders.length === 0) {
    return (
      <main className="your-orders-page">
        <div className="your-orders-container">
          <div className="orders-message" role="alert">
            <h2>We couldn’t load your orders</h2>
            <p>{error}</p>
            <button
              type="button"
              className="orders-primary-btn"
              onClick={() => refreshOrders(true)}
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="your-orders-page">
      <div className="your-orders-container">
        <header className="your-orders-header">
          <h1>YOUR ORDERS</h1>
          <p>Track your orders and keep up with every step of your delivery.</p>
        </header>

        <section className="orders-summary" aria-label="Order summary">
          <div>
            <span>Total Orders</span>
            <strong>{summary.total}</strong>
          </div>
          <div>
            <span>In Progress</span>
            <strong>{summary.inProgress}</strong>
          </div>
          <div>
            <span>Delivered</span>
            <strong>{summary.delivered}</strong>
          </div>
        </section>

        <nav className="orders-tabs" aria-label="Filter orders">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              aria-current={activeTab === tab.key ? "page" : undefined}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {counts[tab.key] > 0 && <span>{counts[tab.key]}</span>}
            </button>
          ))}
        </nav>

        {refreshError && (
          <p className="orders-refresh-warning" role="status">
            {refreshError} Showing saved order information.
          </p>
        )}

        <section className="orders-list-section">
          <div className="orders-list-heading">
            <h2>Order History</h2>
            <span>
              {visibleOrders.length}{" "}
              {visibleOrders.length === 1 ? "order" : "orders"}
            </span>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="orders-empty">
              <p>No orders here yet.</p>
            </div>
          ) : (
            <div className="orders-list">
              {visibleOrders.map((order) => {
                const reference = getOrderReference(order);
                const status = normalizeStatus(order.orderStatus);
                const delivered = status === "delivered";
                const cancelled = status === "cancelled";
                const expanded = delivered
                  ? Boolean(expandedOrders[reference])
                  : !expandedOrders[reference];
                const currentStep = ORDER_STEPS.indexOf(status);

                return (
                  <article
                    className={`order-card ${delivered && !expanded ? "order-card-compact" : ""}`}
                    key={reference}
                  >
                    <div className="order-card-header">
                      <div className="order-heading-info">
                        <span className="order-reference-label">
                          ORDER REFERENCE
                        </span>
                        <h3>#{reference}</h3>
                        <p>
                          {getItemCount(order)}{" "}
                          {getItemCount(order) === 1 ? "item" : "items"}
                          <span>·</span>
                          {formatOrderDate(getOrderDate(order))}
                        </p>
                      </div>
                      <div className="order-header-actions">
                        {order.returnStatus && (
                          <span className="order-return-tag">
                            Return {order.returnStatus}
                          </span>
                        )}
                        <span className={`order-status ${status}`}>
                          <span className="status-dot" />
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        <button
                          type="button"
                          className="expand-order-btn"
                          aria-label={`${expanded ? "Collapse" : "Expand"} order ${reference}`}
                          aria-expanded={expanded}
                          onClick={() => toggleOrder(order)}
                        >
                          <FontAwesomeIcon
                            icon={expanded ? faChevronUp : faChevronDown}
                          />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <>
                        <div className="order-products">
                          {(order.items || []).map((item, index) => {
                            const shoe = getItemShoe(item);
                            const image = getProductImage(shoe);
                            return (
                              <div
                                className="order-product"
                                key={item._id || `${reference}-${index}`}
                              >
                                <div className="order-product-image">
                                  <img
                                    src={image}
                                    alt={shoe.name || "Ordered product"}
                                    onError={(event) => {
                                      event.currentTarget.onerror = null;
                                      event.currentTarget.src =
                                        "/product-images/product%201.png";
                                    }}
                                  />
                                </div>
                                <div className="order-product-info">
                                  <span className="product-brand">
                                    {shoe.brand || "SHOE HUB"}
                                  </span>
                                  <h4>{shoe.name || "Product unavailable"}</h4>
                                  <p>
                                    Size {item.size || "N/A"} <span>·</span>{" "}
                                    {item.color || shoe.color || "Color N/A"}{" "}
                                    <span>·</span> Qty {item.quantity || 1}
                                  </p>
                                </div>
                                <strong className="order-line-total">
                                  {formatMoney(getLineTotal(item))}
                                </strong>
                              </div>
                            );
                          })}
                        </div>

                        {!delivered && !cancelled && (
                          <div
                            className="order-tracker"
                            aria-label="Order progress"
                          >
                            {ORDER_STEPS.map((step, index) => {
                              const complete = currentStep >= index;
                              return (
                                <div
                                  className={`tracker-step ${complete ? "completed" : ""} ${currentStep === index ? "current" : ""}`}
                                  key={step}
                                >
                                  <span className="tracker-line" />
                                  <span className="tracker-icon">
                                    {currentStep > index ? "✓" : index + 1}
                                  </span>
                                  <span className="tracker-label">
                                    {step.charAt(0).toUpperCase() +
                                      step.slice(1)}
                                  </span>
                                  {complete && getStepDate(order, step) && (
                                    <small>{getStepDate(order, step)}</small>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {cancelled && (
                          <p className="cancelled-notice">
                            This order has been cancelled.
                          </p>
                        )}

                        <div className="order-card-footer">
                          <div className="order-total">
                            <span>Order total</span>
                            <strong>{formatMoney(order.totalPrice)}</strong>
                          </div>
                          <div className="order-buttons">
                            <Link
                              className="order-details-btn"
                              to={`/orders/${encodeURIComponent(reference)}`}
                            >
                              View Details
                            </Link>
                            {delivered ? (
                              <button
                                type="button"
                                className="track-order-btn"
                                onClick={() => buyAgain(order)}
                              >
                                Buy Again
                              </button>
                            ) : (
                              !cancelled && (
                                <Link
                                  className="track-order-btn"
                                  to={`/orders/${encodeURIComponent(reference)}/track`}
                                >
                                  Track Order
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {delivered && !expanded && (
                      <div className="order-card-footer order-card-compact-footer">
                        <div className="order-total">
                          <span>Order total</span>
                          <strong>{formatMoney(order.totalPrice)}</strong>
                        </div>
                        <div className="order-buttons">
                          <Link
                            className="order-details-btn"
                            to={`/orders/${encodeURIComponent(reference)}`}
                          >
                            View Details
                          </Link>
                          <button
                            type="button"
                            className="track-order-btn"
                            onClick={() => buyAgain(order)}
                          >
                            Buy Again
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
