import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatMoney,
  formatOrderDate,
  getItemShoe,
  getOrderDate,
  getOrderReference,
  getProductImage,
  loadCustomerOrder,
} from "./customerOrders.js";
import "./OrderPages.css";
import "./TrackOrder.css";

const STEPS = ["pending", "processing", "shipped", "delivered"];
const formatStatus = (status) =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";
const normalizeStatus = (status) => (status || "pending").toLowerCase();
const RETURN_LABELS = {
  requested: "Return requested. Waiting for the store to review it.",
  approved: "Return approved. The store will process your refund.",
  rejected: "Your return request was not approved.",
  refunded: "Refunded.",
};

const getStepEvent = (order, step) =>
  (order.statusHistory || []).find(
    (entry) => entry.status?.toLowerCase() === step,
  );

const getStepDate = (order, step) => {
  const event = getStepEvent(order, step);
  if (event?.changedAt) return event.changedAt;
  if (step === "pending") return getOrderDate(order);
  if (normalizeStatus(order.orderStatus) === step)
    return order.updatedAt || getOrderDate(order);
  return null;
};

const formatActivityDateTime = (date) => {
  const parsedDate = new Date(date);
  if (!date || Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return `${formatOrderDate(parsedDate)} · ${parsedDate.toLocaleTimeString(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;
};

const getStatusMessage = (status) => {
  switch (status) {
    case "pending":
      return "Your order is waiting to be processed.";
    case "processing":
      return "Your order is being prepared.";
    case "shipped":
      return "Your order is on its way.";
    case "delivered":
      return "Your order has been delivered. We hope you enjoy it!";
    case "cancelled":
      return "This order has been cancelled.";
    default:
      return "We’re getting the latest update for your order.";
  }
};

export default function TrackOrder() {
  const { reference } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const refreshOrder = useCallback(async () => {
    try {
      setOrder(await loadCustomerOrder(reference));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => refreshOrder(), 0);
    const intervalId = window.setInterval(() => refreshOrder(), 60000);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [refreshOrder]);

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(order.trackingNumber);
      setCopyMessage("Tracking number copied.");
    } catch {
      setCopyMessage("Could not copy the tracking number.");
    }
  };

  if (loading) {
    return (
      <main className="order-page">
        <div className="order-page-loading">
          Loading tracking information...
        </div>
      </main>
    );
  }
  if (error || !order) {
    return (
      <main className="order-page">
        <div className="order-page-state" role="alert">
          <h1>Tracking unavailable</h1>
          <p>{error || "We couldn't find this order."}</p>
          <Link to="/your-order">Back to orders</Link>
        </div>
      </main>
    );
  }

  const status = normalizeStatus(order.orderStatus);
  const currentStep = STEPS.indexOf(status);
  const delivered = status === "delivered";
  const cancelled = status === "cancelled";
  const history = order.statusHistory?.length
    ? [...order.statusHistory].sort(
        (a, b) =>
          new Date(b.changedAt || 0).getTime() -
          new Date(a.changedAt || 0).getTime(),
      )
    : [
        {
          status: order.orderStatus,
          changedAt: order.updatedAt || getOrderDate(order),
        },
      ];
  const firstItem = (order.items || [])[0];
  const firstShoe = firstItem ? getItemShoe(firstItem) : null;

  return (
    <main className="order-page track-page">
      <div className="order-page-container">
        <Link className="order-back-link" to="/your-order">
          ← Back to orders
        </Link>

        <header className="order-track-header">
          <div>
            <p className="order-page-eyebrow">TRACKING ORDER</p>
            <h1>#{getOrderReference(order)}</h1>
            <p className="order-track-message">{getStatusMessage(status)}</p>
          </div>
          <div className="order-track-header-actions">
            <span className={`order-status ${status}`}>
              <span className="status-dot" />
              {formatStatus(status)}
            </span>
          </div>
        </header>

        {!order.live && (
          <p className="order-live-warning" role="status">
            Showing saved order information. Live tracking updates are
            unavailable.
          </p>
        )}
        {error && (
          <p className="order-live-warning" role="alert">
            {error}
          </p>
        )}

        {delivered ? (
          <div className="order-track-delivered">
            <section className="order-panel order-success-panel">
              <span className="order-success-mark">✓</span>
              <h2>Delivered successfully</h2>
              <p>{getStatusDateLabel(order, "delivered")}</p>
            </section>
            {order.returnStatus && (
              <section className="order-panel">
                <h2>Return request</h2>
                <p>{RETURN_LABELS[order.returnStatus]}</p>
                {order.returnNote && (
                  <p>Note from the store: {order.returnNote}</p>
                )}
              </section>
            )}
            <OrderRecap order={order} item={firstItem} shoe={firstShoe} />
          </div>
        ) : (
          <>
            <section className="order-panel order-tracker-panel">
              <div className="order-section-heading">
                <div>
                  <h2>Delivery progress</h2>
                  <p>We’ll keep you updated as your order moves.</p>
                </div>
              </div>
              {cancelled ? (
                <p className="order-cancelled-copy">
                  This order has been cancelled and will not be delivered.
                </p>
              ) : (
                <div className="order-tracker order-tracker-large">
                  {STEPS.map((step, index) => {
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
                          {formatStatus(step)}
                        </span>
                        <small>
                          {complete
                            ? formatOrderDate(getStepDate(order, step))
                            : " "}
                        </small>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {!cancelled && (
              <div className="order-track-columns">
                <div className="order-track-main">
                  <section className="order-panel order-estimate-panel">
                    <span className="order-panel-kicker">
                      ESTIMATED DELIVERY
                    </span>
                    <strong>
                      {order.estimatedDelivery
                        ? formatOrderDate(order.estimatedDelivery)
                        : "Awaiting shipment estimate"}
                    </strong>
                  </section>

                  {currentStep >= 2 && (
                    <section className="order-panel">
                      <h2>Shipment information</h2>
                      <div className="order-shipment-grid">
                        {order.courier && (
                          <div>
                            <span>Courier</span>
                            <strong>{order.courier}</strong>
                          </div>
                        )}
                        {order.trackingNumber && (
                          <div>
                            <span>Tracking number</span>
                            <div className="order-tracking-copy">
                              <strong>{order.trackingNumber}</strong>
                              <button type="button" onClick={copyTracking}>
                                Copy
                              </button>
                            </div>
                          </div>
                        )}
                        {!order.courier && !order.trackingNumber && (
                          <p>Shipment details are not available yet.</p>
                        )}
                      </div>
                      {copyMessage && (
                        <p className="order-copy-message" role="status">
                          {copyMessage}
                        </p>
                      )}
                    </section>
                  )}

                  <section className="order-panel">
                    <h2>Activity</h2>
                    <div className="order-activity">
                      {history.map((event, index) => (
                        <div
                          className="order-activity-item"
                          key={`${event.status}-${event.changedAt || index}`}
                        >
                          <span
                            className={`order-activity-dot ${event.status}`}
                          />
                          <div>
                            <strong>{formatStatus(event.status)}</strong>
                            {event.note && <p>{event.note}</p>}
                            <time>
                              {formatActivityDateTime(event.changedAt)}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <OrderRecap order={order} item={firstItem} shoe={firstShoe} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function getStatusDateLabel(order, status) {
  const event = getStepEvent(order, status);
  const date = event?.changedAt || order.deliveredAt || order.updatedAt;
  return date
    ? `Delivered on ${formatOrderDate(date)}`
    : "Delivered date unavailable";
}

function OrderRecap({ order, item, shoe }) {
  return (
    <aside className="order-panel order-recap-panel">
      <h2>Order recap</h2>
      {item && (
        <div className="order-recap-item">
          {item && (
            <div className="order-recap-image">
              <img
                src={getProductImage(shoe)}
                alt={shoe.name || "Ordered product"}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/product-images/product%201.png";
                }}
              />
            </div>
          )}
          <div>
            <strong>{shoe?.name || "Product unavailable"}</strong>
            <span>Qty {item.quantity || 1}</span>
          </div>
        </div>
      )}
      <div className="order-recap-total">
        <span>{order.items?.length || 0} items</span>
        <strong>{formatMoney(order.totalPrice)}</strong>
      </div>
      <Link to={`/orders/${encodeURIComponent(getOrderReference(order))}`}>
        View Details →
      </Link>
    </aside>
  );
}
