import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addOrderToCart,
  cancelCustomerOrder,
  formatMoney,
  formatOrderDate,
  getItemShoe,
  getLineTotal,
  getOrderDate,
  getOrderReference,
  getProductImage,
  loadCustomerOrder,
  requestCustomerReturn,
} from "./customerOrders.js";
import "./OrderPages.css";

const formatStatus = (status) =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";

const orderStatus = (order) => (order.orderStatus || "pending").toLowerCase();

const RETURN_WINDOW_DAYS = 7;
const RETURN_LABELS = {
  requested: "Return requested. Waiting for the store to review it.",
  approved: "Return approved. The store will process your refund.",
  rejected: "Your return request was not approved.",
  refunded: "Refunded.",
};

const withinReturnWindow = (order) => {
  const deliveredAt =
    order.deliveredAt ||
    (order.statusHistory || []).find((entry) => entry.status === "delivered")
      ?.changedAt;
  if (!deliveredAt) return true;
  return (
    Date.now() - new Date(deliveredAt).getTime() <=
    RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
};

export default function OrderDetails() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setOrder(await loadCustomerOrder(reference));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    const timerId = window.setTimeout(fetchOrder, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchOrder]);

  const items = order?.items || [];
  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const shipping = Number(order?.shippingCost || 0);
  const discount = Number(order?.discountAmount || 0);
  const address = order?.customerInfo;
  const addressLines = address
    ? [
        [address.address, address.city, address.province, address.zipCode]
          .filter(Boolean)
          .join(", "),
        address.phone,
        address.email,
      ].filter(Boolean)
    : [];
  const paymentMethod =
    order?.paymentMethod || order?.paymentInfo?.paymentMethod;
  const paymentStatus =
    order?.paymentStatus || order?.paymentInfo?.paymentStatus;
  const delivered = order && orderStatus(order) === "delivered";
  const pending = order && orderStatus(order) === "pending";
  const canReturn = Boolean(
    delivered &&
    !order.returnStatus &&
    order.customerAccessToken &&
    withinReturnWindow(order),
  );

  const handleCancel = async () => {
    setCancelling(true);
    setActionError("");
    try {
      const updated = await cancelCustomerOrder(
        reference,
        order.customerAccessToken,
      );
      setOrder((current) => ({ ...current, ...updated }));
      setConfirmCancel(false);
    } catch (requestError) {
      setActionError(requestError.message);
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleBuyAgain = () => {
    try {
      addOrderToCart(order);
      navigate("/cart");
    } catch (cartError) {
      setActionError(cartError.message);
    }
  };

  const handleReturn = async () => {
    setReturning(true);
    setActionError("");
    try {
      const updated = await requestCustomerReturn(
        reference,
        order.customerAccessToken,
        returnReason,
      );
      setOrder((current) => ({ ...current, ...updated }));
      setReturnOpen(false);
      setReturnReason("");
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setReturning(false);
    }
  };

  if (loading) {
    return (
      <main className="order-page">
        <div className="order-page-loading">Loading order details...</div>
      </main>
    );
  }
  if (error || !order) {
    return (
      <main className="order-page">
        <div className="order-page-state" role="alert">
          <h1>Order unavailable</h1>
          <p>{error || "We couldn't find this order."}</p>
          <Link to="/your-order">Back to orders</Link>
        </div>
      </main>
    );
  }

  const status = orderStatus(order);
  const referenceLabel = getOrderReference(order);

  return (
    <main className="order-page">
      <div className="order-page-container">
        <Link className="order-back-link" to="/your-order">
          ← Back to orders
        </Link>

        <header className="order-detail-header">
          <div>
            <p className="order-page-eyebrow">ORDER DETAILS</p>
            <h1>#{referenceLabel}</h1>
            <p>Placed on {formatOrderDate(getOrderDate(order))}</p>
          </div>
          <div className="order-detail-actions">
            <span className={`order-status ${status}`}>
              <span className="status-dot" />
              {formatStatus(status)}
            </span>
            {!delivered && (
              <Link
                className="order-action-secondary"
                to={`/orders/${encodeURIComponent(reference)}/track`}
              >
                Track Order
              </Link>
            )}
            {canReturn && (
              <button
                type="button"
                className="order-action-secondary"
                onClick={() => setReturnOpen(true)}
              >
                Request Return
              </button>
            )}
            <button
              type="button"
              className="order-action-primary"
              onClick={handleBuyAgain}
            >
              Buy Again
            </button>
          </div>
        </header>

        {(error || actionError) && (
          <p className="order-page-error" role="alert">
            {actionError || error}
          </p>
        )}
        {order.live === false && (
          <p className="order-live-warning" role="status">
            Showing saved order information. Live order updates are unavailable.
          </p>
        )}

        <div className="order-detail-layout">
          <section className="order-panel order-items-panel">
            <h2>Items ({items.length})</h2>
            <div className="order-detail-items">
              {items.map((item, index) => {
                const shoe = getItemShoe(item);
                return (
                  <article
                    className="order-detail-item"
                    key={item._id || `${reference}-${index}`}
                  >
                    <img
                      src={getProductImage(shoe)}
                      alt={shoe.name || "Ordered product"}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "/product-images/product%201.png";
                      }}
                    />
                    <div className="order-detail-item-copy">
                      {shoe.brand && <span>{shoe.brand}</span>}
                      <h3>{shoe.name || "Product unavailable"}</h3>
                      <p>
                        {item.size ? `Size ${item.size}` : "Size N/A"}
                        {(item.color || shoe.color) &&
                          ` · ${item.color || shoe.color}`}
                        {` · Qty ${item.quantity || 1}`}
                      </p>
                    </div>
                    <strong>{formatMoney(getLineTotal(item))}</strong>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="order-detail-aside">
            <section className="order-panel">
              <h2>Order Summary</h2>
              <dl className="order-summary-lines">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{formatMoney(shipping)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>−{formatMoney(discount)}</dd>
                </div>
                <div className="order-summary-total">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.totalPrice)}</dd>
                </div>
              </dl>
            </section>

            {addressLines.length > 0 && (
              <section className="order-panel">
                <h2>Delivery Address</h2>
                <div className="order-detail-values">
                  {address.firstName || address.lastName ? (
                    <strong>
                      {[address.firstName, address.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </strong>
                  ) : null}
                  {addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>
            )}

            {(paymentMethod || paymentStatus || order.paymentLastFour) && (
              <section className="order-panel">
                <h2>Payment</h2>
                <div className="order-detail-values">
                  {paymentMethod && (
                    <p>
                      <span>Method</span>
                      {paymentMethod}
                    </p>
                  )}
                  {paymentStatus && (
                    <p>
                      <span>Status</span>
                      {formatStatus(paymentStatus)}
                    </p>
                  )}
                  {order.paymentLastFour && (
                    <p>
                      <span>Card</span>••••{" "}
                      {String(order.paymentLastFour).slice(-4)}
                    </p>
                  )}
                </div>
              </section>
            )}

            {(order.courier ||
              order.estimatedDelivery ||
              order.deliveryMethod) && (
              <section className="order-panel">
                <h2>Delivery Method</h2>
                <div className="order-detail-values">
                  {order.deliveryMethod && (
                    <p>
                      <span>Method</span>
                      {order.deliveryMethod}
                    </p>
                  )}
                  {order.courier && (
                    <p>
                      <span>Courier</span>
                      {order.courier}
                    </p>
                  )}
                  {order.estimatedDelivery && (
                    <p>
                      <span>Estimated delivery</span>
                      {formatOrderDate(order.estimatedDelivery)}
                    </p>
                  )}
                </div>
              </section>
            )}
            {order.returnStatus && (
              <section className="order-panel">
                <h2>Return</h2>
                <div className="order-detail-values">
                  <p>
                    <span>Status</span>
                    {RETURN_LABELS[order.returnStatus]}
                  </p>
                  {order.returnReason && (
                    <p>
                      <span>Your reason</span>
                      {order.returnReason}
                    </p>
                  )}
                  {order.returnNote && (
                    <p>
                      <span>Store note</span>
                      {order.returnNote}
                    </p>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>

        {pending && order.customerAccessToken && (
          <div className="order-cancel-row">
            <button
              type="button"
              className="order-cancel-button"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>

      {confirmCancel && (
        <div
          className="order-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cancelling)
              setConfirmCancel(false);
          }}
        >
          <section
            className="order-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <h2 id="cancel-order-title">Cancel this order?</h2>
            <p>
              This action can’t be undone. The order will be marked as
              cancelled.
            </p>
            {actionError && (
              <p className="order-page-error" role="alert">
                {actionError}
              </p>
            )}
            <div>
              <button
                type="button"
                className="order-action-secondary"
                disabled={cancelling}
                onClick={() => setConfirmCancel(false)}
              >
                Keep order
              </button>
              <button
                type="button"
                className="order-cancel-button"
                disabled={cancelling}
                onClick={handleCancel}
              >
                {cancelling ? "Cancelling…" : "Yes, cancel order"}
              </button>
            </div>
          </section>
        </div>
      )}

      {returnOpen && (
        <div
          className="order-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !returning)
              setReturnOpen(false);
          }}
        >
          <section
            className="order-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-order-title"
          >
            <h2 id="return-order-title">Request a return</h2>
            <p>Tell us what went wrong. The store will review your request.</p>
            <label className="order-return-label" htmlFor="return-reason">
              Reason
            </label>
            <textarea
              id="return-reason"
              className="order-return-reason"
              rows="4"
              maxLength={500}
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
            />
            {actionError && (
              <p className="order-page-error" role="alert">
                {actionError}
              </p>
            )}
            <div>
              <button
                type="button"
                className="order-action-secondary"
                disabled={returning}
                onClick={() => setReturnOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="order-action-primary"
                disabled={returning || returnReason.trim().length < 5}
                onClick={handleReturn}
              >
                {returning ? "Sending…" : "Send request"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
