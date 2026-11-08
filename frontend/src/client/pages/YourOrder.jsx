import { useEffect, useState } from "react";
import "./YourOrder.css";

const orderSteps = ["pending", "processing", "shipped", "delivered"];
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");

const formatPrice = (price) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(price || 0);

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatStatus = (status) => {
  if (!status) return "Pending";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getOrderImage = (shoe) => {
  const image = shoe?.image || shoe?.imageUrl || shoe?.img;
  if (!image) return "/product-images/product%201.png";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return `${import.meta.env.VITE_API_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

const readLocalOrders = () => {
  try {
    const savedOrders = JSON.parse(
      localStorage.getItem("shoeHubOrders") || "[]",
    );
    return Array.isArray(savedOrders) ? savedOrders : [];
  } catch {
    return [];
  }
};

export default function YourOrder({
  orders = [],
  loading = false,
  error = "",
  onViewDetails,
  onTrackOrder,
}) {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [localOrders, setLocalOrders] = useState(readLocalOrders);
  const displayedOrders = orders.length > 0 ? orders : localOrders;

  useEffect(() => {
    const refreshOrders = () => setLocalOrders(readLocalOrders());
    window.addEventListener("storage", refreshOrders);
    window.addEventListener("focus", refreshOrders);

    const savedOrders = readLocalOrders();
    const references = savedOrders
      .map((order) => order.orderReference)
      .filter(Boolean);

    if (references.length > 0) {
      const refreshFromServer = () => fetch(`${BASE_URL}/api/customer-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references }),
      })
        .then((response) => (response.ok ? response.json() : []))
        .then((serverOrders) => {
          if (Array.isArray(serverOrders) && serverOrders.length > 0) {
            setLocalOrders(serverOrders);
            localStorage.setItem("shoeHubOrders", JSON.stringify(serverOrders));
          }
        })
        .catch(() => {});

      refreshFromServer();
      const pollingInterval = window.setInterval(refreshFromServer, 30000);
      return () => {
        window.clearInterval(pollingInterval);
        window.removeEventListener("storage", refreshOrders);
        window.removeEventListener("focus", refreshOrders);
      };
    }

    return () => {
      window.removeEventListener("storage", refreshOrders);
      window.removeEventListener("focus", refreshOrders);
    };
  }, []);

  const toggleOrder = (id) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  const getStatusIndex = (status) => {
    return orderSteps.indexOf(status?.toLowerCase());
  };

  const getStatusClass = (status) => {
    const normalized = status?.toLowerCase();

    if (normalized === "delivered") return "delivered";
    if (normalized === "shipped") return "shipped";
    if (normalized === "processing") return "processing";
    if (normalized === "cancelled") return "cancelled";

    return "pending";
  };

  const getCustomerAddress = (customer) => {
    if (!customer) return "No delivery address available";

    return [
      customer.address,
      customer.city,
      customer.province,
      customer.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="your-orders-page">
        <div className="orders-loading">
          <div className="orders-spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="your-orders-page">
        <div className="orders-message">
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="your-orders-page">
      <div className="your-orders-container">
        {/* PAGE HEADER */}
        <header className="your-orders-header">
          <h1>YOUR ORDERS</h1>
          <p>Track your orders and keep up with every step of your delivery.</p>
        </header>

        {/* ORDER SUMMARY */}
        <section className="orders-summary">
          <div>
            <span>Total Orders</span>
            <h2>{displayedOrders.length}</h2>
          </div>

          <div>
            <span>In Progress</span>
            <h2>
              {
                displayedOrders.filter((order) =>
                  ["pending", "processing", "shipped"].includes(
                    order.orderStatus?.toLowerCase(),
                  ),
                ).length
              }
            </h2>
          </div>

          <div>
            <span>Delivered</span>
            <h2>
              {
                displayedOrders.filter(
                  (order) => order.orderStatus?.toLowerCase() === "delivered",
                ).length
              }
            </h2>
          </div>
        </section>

        {/* ORDER LIST */}
        <section className="orders-list-section">
          <div className="orders-list-heading">
            <h2>Order History</h2>
            <span>{displayedOrders.length} orders</span>
          </div>

          {displayedOrders.length === 0 ? (
            <div className="orders-empty">
              <div className="empty-order-icon">▤</div>
              <h3>No orders yet</h3>
              <p>
                Looks like you haven't placed an order yet. Your next favorite
                pair is waiting for you.
              </p>
            </div>
          ) : (
            <div className="orders-list">
              {displayedOrders.map((order) => {
                const orderId = order._id;
                const status = order.orderStatus?.toLowerCase() || "pending";
                const statusIndex = getStatusIndex(status);
                const customer = order.customerInfo;
                const isExpanded = expandedOrder === orderId;
                const isCancelled = status === "cancelled";

                return (
                  <article className="order-card" key={orderId}>
                    {/* ORDER HEADER */}
                    <div className="order-card-header">
                      <div className="order-heading-info">
                        <span className="order-reference-label">
                          ORDER REFERENCE
                        </span>

                        <h3>#{order.orderReference || orderId}</h3>

                        <p>
                          {formatDate(order.createdAt)}
                          <span>•</span>
                          {formatTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="order-header-actions">
                        <span
                          className={`order-status ${getStatusClass(status)}`}
                        >
                          <span className="status-dot"></span>
                          {formatStatus(status)}
                        </span>

                        <button
                          className="expand-order-btn"
                          onClick={() => toggleOrder(orderId)}
                          aria-label="Toggle order details"
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                      </div>
                    </div>

                    {/* PRODUCT INFORMATION */}
                    <div className="order-products">
                      {order.items?.map((item, index) => {
                        const shoe = item.shoeId;

                        return (
                          <div
                            className="order-product"
                            key={item._id || index}
                          >
                            <div className="order-product-image">
                              {shoe?.image ? (
                                <img
                                  src={getOrderImage(shoe)}
                                  alt={shoe.name || "Shoe"}
                                />
                              ) : (
                                <span>No Image</span>
                              )}
                            </div>

                            <div className="order-product-info">
                              <span className="product-brand">
                                {shoe?.brand || "SHOE HUB"}
                              </span>

                              <h4>{shoe?.name || "Product unavailable"}</h4>

                              <p>
                                Size: {item.size || "N/A"}
                                <span>•</span>
                                Color: {item.color || shoe?.color || "Standard"}
                                <span>•</span>
                                Qty: {item.quantity}
                              </p>

                              <strong>
                                {formatPrice(
                                  (item.price ?? shoe?.price ?? 0) *
                                    (item.quantity || 1),
                                )}
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* ORDER TRACKER */}
                    {!isCancelled && (
                      <div className="order-tracker">
                        {orderSteps.map((step, index) => {
                          const isCompleted =
                            statusIndex >= index && statusIndex !== -1;

                          const isCurrent = statusIndex === index;

                          return (
                            <div
                              className={`tracker-step ${
                                isCompleted ? "completed" : ""
                              } ${isCurrent ? "current" : ""}`}
                              key={step}
                            >
                              <div className="tracker-line"></div>

                              <div className="tracker-icon">
                                {isCompleted ? "✓" : index + 1}
                              </div>

                              <span className="tracker-label">
                                {formatStatus(step)}
                              </span>

                              {isCurrent && (
                                <small>
                                  Last updated: {formatDate(order.updatedAt)}
                                </small>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isCancelled && (
                      <div className="cancelled-notice">
                        This order has been cancelled.
                      </div>
                    )}

                    {/* ORDER FOOTER */}
                    <div className="order-card-footer">
                      <div className="order-total">
                        <span>Order Total</span>
                        <strong>{formatPrice(order.totalPrice)}</strong>
                      </div>

                      <div className="order-buttons">
                        <button
                          className="order-details-btn"
                          onClick={() => onViewDetails?.(order)}
                        >
                          View Details →
                        </button>

                        {!isCancelled && (
                          <button
                            className="track-order-btn"
                            onClick={() => onTrackOrder?.(order)}
                          >
                            Track Order
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="expanded-order-details">
                        <h4>Delivery Information</h4>

                        <div className="delivery-details-grid">
                          <div>
                            <span>Customer Name</span>
                            <p>
                              {customer
                                ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                                : "Not available"}
                            </p>
                          </div>

                          <div>
                            <span>Delivery Address</span>
                            <p>{getCustomerAddress(customer)}</p>
                          </div>

                          <div>
                            <span>Contact Number</span>
                            <p>{customer?.phone || "Not available"}</p>
                          </div>

                          <div>
                            <span>Email Address</span>
                            <p>{customer?.email || "Not available"}</p>
                          </div>

                          <div>
                            <span>Payment Method</span>
                            <p>{order.paymentMethod || "Not available"}</p>
                          </div>

                          <div>
                            <span>Payment Status</span>
                            <p>{formatStatus(order.paymentStatus)}</p>
                          </div>
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
